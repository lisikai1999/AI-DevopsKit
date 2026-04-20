import { WorkflowStatus, StepStatus, ActionType } from './workflow-engine'
import { aiService } from './ai-service'
import axios from 'axios'

export class WorkflowExecutor {
  constructor() {
    this.runningExecutions = new Map()
    this.executionCallbacks = new Map()
  }

  subscribe(executionId, callback) {
    if (!this.executionCallbacks.has(executionId)) {
      this.executionCallbacks.set(executionId, [])
    }
    this.executionCallbacks.get(executionId).push(callback)
    return () => {
      const callbacks = this.executionCallbacks.get(executionId)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  notify(executionId, event) {
    const callbacks = this.executionCallbacks.get(executionId)
    if (callbacks) {
      callbacks.forEach(cb => cb(event))
    }
  }

  replaceVariables(value, variables, stepResults) {
    if (typeof value !== 'string') {
      return value
    }

    let result = value
    
    const variablePattern = /\{\{([^{}]+)\}\}/g
    result = result.replace(variablePattern, (match, key) => {
      const trimmedKey = key.trim()
      
      if (stepResults && stepResults.has(trimmedKey)) {
        const stepResult = stepResults.get(trimmedKey)
        if (stepResult && typeof stepResult === 'object' && stepResult.content) {
          try {
            const parsed = JSON.parse(stepResult.content)
            if (parsed.score !== undefined) {
              return parsed.score
            }
            if (parsed.totalCost !== undefined) {
              return parsed.totalCost
            }
            return stepResult.content.substring(0, 100)
          } catch {
            return stepResult.content.substring(0, 100)
          }
        }
        return stepResult || match
      }
      
      if (trimmedKey.includes('.')) {
        const parts = trimmedKey.split('.')
        let current = stepResults
        for (let i = 0; i < parts.length - 1; i++) {
          if (current.has(parts[i])) {
            current = current.get(parts[i])
          } else {
            return match
          }
        }
        const lastKey = parts[parts.length - 1]
        if (current && current[lastKey] !== undefined) {
          return current[lastKey]
        }
        return match
      }
      
      if (variables && variables[trimmedKey] !== undefined) {
        return variables[trimmedKey]
      }
      
      if (trimmedKey === 'timestamp') {
        return new Date().toISOString()
      }
      
      return match
    })

    return result
  }

  replaceVariablesInObject(obj, variables, stepResults) {
    if (obj === null || obj === undefined) {
      return obj
    }
    
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables, stepResults)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, variables, stepResults))
    }
    
    if (typeof obj === 'object') {
      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, variables, stepResults)
      }
      return result
    }
    
    return obj
  }

  async executeStep(step, execution, engine) {
    const stepId = step.id
    const stepStatus = execution.stepStatuses[stepId]
    
    if (!stepStatus) {
      throw new Error(`Step status not found: ${stepId}`)
    }

    stepStatus.status = StepStatus.RUNNING
    stepStatus.startTime = Date.now()

    this.notify(execution.id, {
      type: 'step_started',
      stepId,
      stepName: step.name,
      timestamp: new Date().toISOString()
    })

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId,
      message: `开始执行步骤: ${step.name}`
    })

    try {
      let result
      const config = this.replaceVariablesInObject(step.config, execution.variables, execution.stepResults)

      switch (step.actionType) {
        case ActionType.GENERATE_CICD_CONFIG:
          result = await this.executeGenerateCICDConfig(config, step, execution)
          break

        case ActionType.GENERATE_JENKINSFILE:
          result = await this.executeGenerateJenkinsfile(config, step, execution)
          break

        case ActionType.ANALYZE_DOCKERFILE:
          result = await this.executeAnalyzeDockerfile(config, step, execution)
          break

        case ActionType.ANALYZE_CICD_CONFIG:
          result = await this.executeAnalyzeCICDConfig(config, step, execution)
          break

        case ActionType.ANALYZE_BILLING:
          result = await this.executeAnalyzeBilling(config, step, execution)
          break

        case ActionType.TRANSLATE_LOG:
          result = await this.executeTranslateLog(config, step, execution)
          break

        case ActionType.WEBHOOK:
          result = await this.executeWebhook(config, step, execution)
          break

        case ActionType.DELAY:
          result = await this.executeDelay(config, step, execution)
          break

        case ActionType.CONDITION:
          result = await this.executeCondition(config, step, execution)
          break

        case ActionType.PARALLEL:
          result = await this.executeParallel(config, step, execution, engine)
          break

        case ActionType.CUSTOM_ACTION:
          result = await this.executeCustomAction(config, step, execution)
          break

        default:
          result = {
            success: true,
            content: '步骤执行完成（默认）',
            data: {}
          }
      }

      execution.stepResults[stepId] = result
      stepStatus.status = StepStatus.COMPLETED
      stepStatus.endTime = Date.now()

      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId,
        message: `步骤执行完成: ${step.name}`
      })

      this.notify(execution.id, {
        type: 'step_completed',
        stepId,
        stepName: step.name,
        result,
        timestamp: new Date().toISOString()
      })

      return result

    } catch (error) {
      stepStatus.status = StepStatus.FAILED
      stepStatus.endTime = Date.now()
      stepStatus.error = error.message

      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        stepId,
        message: `步骤执行失败: ${step.name} - ${error.message}`
      })

      this.notify(execution.id, {
        type: 'step_failed',
        stepId,
        stepName: step.name,
        error: error.message,
        timestamp: new Date().toISOString()
      })

      if (step.retryPolicy?.enabled && stepStatus.retries < step.retryPolicy.maxRetries) {
        stepStatus.retries++
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'warn',
          stepId,
          message: `步骤重试 (${stepStatus.retries}/${step.retryPolicy.maxRetries}): ${step.name}`
        })

        this.notify(execution.id, {
          type: 'step_retry',
          stepId,
          stepName: step.name,
          retryCount: stepStatus.retries,
          timestamp: new Date().toISOString()
        })

        await this.delay(step.retryPolicy.delay || 1000)
        return this.executeStep(step, execution, engine)
      }

      throw error
    }
  }

  async executeGenerateCICDConfig(config, step, execution) {
    const platform = config.platform || 'jenkins'
    const template = config.template || 'simple'
    const variables = config.variables || {}

    const platformNames = {
      jenkins: 'Jenkins',
      gitlab: 'GitLab CI/CD',
      github: 'GitHub Actions',
      azure: 'Azure DevOps'
    }

    const platformName = platformNames[platform] || 'Jenkins'

    const result = await aiService.generateCICDConfig(
      platform,
      platformName,
      '',
      variables,
      template
    )

    if (!result.success) {
      throw new Error(result.error || '生成 CI/CD 配置失败')
    }

    return {
      success: true,
      content: result.content,
      data: {
        platform,
        template,
        generatedConfig: result.content
      }
    }
  }

  async executeGenerateJenkinsfile(config, step, execution) {
    const template = config.template || 'basic'
    const parameters = config.parameters || {}

    const result = await aiService.generateJenkinsfile(
      template,
      parameters,
      template
    )

    if (!result.success) {
      throw new Error(result.error || '生成 Jenkinsfile 失败')
    }

    return {
      success: true,
      content: result.content,
      data: {
        template,
        generatedConfig: result.content
      }
    }
  }

  async executeAnalyzeDockerfile(config, step, execution) {
    const dockerfileContent = config.content || 
      `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]`

    const result = await aiService.analyzeDockerfile(dockerfileContent)

    if (!result.success) {
      throw new Error(result.error || '分析 Dockerfile 失败')
    }

    try {
      const parsed = JSON.parse(result.content)
      return {
        success: true,
        content: result.content,
        data: {
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
          score: parsed.score || 0,
          optimizedContent: parsed.optimizedContent
        }
      }
    } catch {
      return {
        success: true,
        content: result.content,
        data: {}
      }
    }
  }

  async executeAnalyzeCICDConfig(config, step, execution) {
    const platform = config.platform || 'jenkins'
    const content = config.content

    let defaultContent
    switch (platform) {
      case 'jenkins':
        defaultContent = `pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
    }
}`
        break
      case 'github':
        defaultContent = `name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm build`
        break
      default:
        defaultContent = 'stages:\n  - build'
    }

    const result = await aiService.analyzeCICDConfig(
      content || defaultContent,
      platform
    )

    if (!result.success) {
      throw new Error(result.error || '分析 CI/CD 配置失败')
    }

    try {
      const parsed = JSON.parse(result.content)
      return {
        success: true,
        content: result.content,
        data: {
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
          score: parsed.score || 0,
          fixedContent: parsed.fixedContent,
          summary: parsed.summary
        }
      }
    } catch {
      return {
        success: true,
        content: result.content,
        data: {}
      }
    }
  }

  async executeAnalyzeBilling(config, step, execution) {
    const csvContent = config.csvContent ||
      `Resource,Cost,Usage
EC2,734.12,100
S3,256.50,200
RDS,150.75,50
CloudFront,104.30,25`

    const result = await aiService.analyzeBillingCSV(csvContent)

    if (!result.success) {
      throw new Error(result.error || '分析账单失败')
    }

    try {
      const parsed = JSON.parse(result.content)
      return {
        success: true,
        content: result.content,
        data: {
          summary: parsed.summary || {},
          topResources: parsed.topResources || [],
          suggestions: parsed.suggestions || [],
          chartData: parsed.chartData || {}
        }
      }
    } catch {
      return {
        success: true,
        content: result.content,
        data: {}
      }
    }
  }

  async executeTranslateLog(config, step, execution) {
    const logContent = config.logContent ||
      `ERROR: Connection to database failed: timeout
DETAIL: The database server is not reachable.`

    const result = await aiService.translateLog(logContent)

    if (!result.success) {
      throw new Error(result.error || '翻译日志失败')
    }

    try {
      const parsed = JSON.parse(result.content)
      return {
        success: true,
        content: result.content,
        data: {
          translation: parsed.translation,
          explanation: parsed.explanation,
          fixes: parsed.fixes || []
        }
      }
    } catch {
      return {
        success: true,
        content: result.content,
        data: {}
      }
    }
  }

  async executeWebhook(config, step, execution) {
    const url = config.url
    const method = config.method || 'POST'
    const payload = config.payload || {}
    const headers = config.headers || { 'Content-Type': 'application/json' }
    const validateResponse = config.validateResponse || false
    const expectedStatusCode = config.expectedStatusCode || 200

    if (!url) {
      throw new Error('Webhook URL 未配置')
    }

    let response
    try {
      const axiosConfig = {
        method: method.toLowerCase(),
        url,
        headers,
        timeout: config.timeout || 30000
      }

      if (method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'DELETE') {
        axiosConfig.data = payload
      }

      response = await axios(axiosConfig)

      if (validateResponse && response.status !== expectedStatusCode) {
        throw new Error(`Webhook 响应状态码错误: 期望 ${expectedStatusCode}, 实际 ${response.status}`)
      }

      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'debug',
        stepId: step.id,
        message: `Webhook 响应: ${response.status}`
      })

      return {
        success: true,
        content: JSON.stringify(response.data, null, 2),
        data: {
          url,
          method,
          status: response.status,
          responseData: response.data
        }
      }
    } catch (error) {
      if (error.response) {
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          stepId: step.id,
          message: `Webhook 错误响应: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        })
      }
      throw error
    }
  }

  async executeDelay(config, step, execution) {
    const delayMs = config.delay || 1000
    const requireApproval = config.requireApproval || false

    if (requireApproval) {
      this.notify(execution.id, {
        type: 'approval_required',
        stepId: step.id,
        stepName: step.name,
        approvers: config.approvers || [],
        timestamp: new Date().toISOString()
      })

      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId: step.id,
        message: `等待人工审批...`
      })

      return {
        success: true,
        content: '等待审批',
        data: {
          requireApproval: true,
          approvers: config.approvers || [],
          status: 'pending_approval'
        }
      }
    }

    if (delayMs > 0) {
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId: step.id,
        message: `等待 ${delayMs} 毫秒...`
      })

      await this.delay(delayMs)
    }

    return {
      success: true,
      content: `延迟 ${delayMs} 毫秒完成`,
      data: {
        delayMs,
        duration: delayMs
      }
    }
  }

  async executeCondition(config, step, execution) {
    const condition = config.condition
    const onTrue = config.onTrue || []
    const onFalse = config.onFalse || []

    let conditionResult = false
    try {
      const processedCondition = this.replaceVariables(
        condition,
        execution.variables,
        execution.stepResults
      )
      
      const fn = new Function('variables', 'stepResults', `return ${processedCondition}`)
      conditionResult = fn(execution.variables, execution.stepResults)
    } catch (error) {
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'warn',
        stepId: step.id,
        message: `条件表达式解析失败，使用默认值 false: ${error.message}`
      })
      conditionResult = false
    }

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId: step.id,
      message: `条件判断结果: ${conditionResult}`
    })

    const stepsToExecute = conditionResult ? onTrue : onFalse
    const subResults = []

    for (const subStep of stepsToExecute) {
      const subStepId = `${step.id}_${subStep.id}`
      const subStepClone = { ...subStep, id: subStepId }
      
      execution.stepStatuses.set(subStepId, {
        status: StepStatus.PENDING,
        startTime: null,
        endTime: null,
        retries: 0,
        error: null
      })

      try {
        const subResult = await this.executeStep(subStepClone, execution, null)
        subResults.push({ stepId: subStepId, result: subResult })
      } catch (error) {
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          stepId: step.id,
          message: `子步骤执行失败: ${error.message}`
        })
        throw error
      }
    }

    return {
      success: true,
      content: `条件判断完成，执行了 ${subResults.length} 个子步骤`,
      data: {
        condition,
        result: conditionResult,
        subResults
      }
    }
  }

  async executeParallel(config, step, execution, engine) {
    const parallelSteps = config.parallelSteps || []

    if (parallelSteps.length === 0) {
      return {
        success: true,
        content: '没有并行步骤需要执行',
        data: {}
      }
    }

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId: step.id,
      message: `开始并行执行 ${parallelSteps.length} 个步骤`
    })

    const promises = parallelSteps.map(async (subStep, index) => {
      const subStepId = `${step.id}_parallel_${index}`
      const subStepClone = { ...subStep, id: subStepId }
      
      execution.stepStatuses.set(subStepId, {
        status: StepStatus.PENDING,
        startTime: null,
        endTime: null,
        retries: 0,
        error: null
      })

      try {
        return await this.executeStep(subStepClone, execution, engine)
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stepId: subStepId
        }
      }
    })

    const results = await Promise.allSettled(promises)
    
    const successResults = []
    const failedResults = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successResults.push(result.value)
        } else {
          failedResults.push(result.value)
        }
      } else {
        failedResults.push({
          success: false,
          error: result.reason?.message || 'Unknown error',
          stepIndex: index
        })
      }
    })

    if (failedResults.length > 0) {
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        stepId: step.id,
        message: `并行执行中 ${failedResults.length} 个步骤失败`
      })
    }

    return {
      success: failedResults.length === 0,
      content: `并行执行完成: 成功 ${successResults.length}, 失败 ${failedResults.length}`,
      data: {
        totalSteps: parallelSteps.length,
        successCount: successResults.length,
        failedCount: failedResults.length,
        successResults,
        failedResults
      }
    }
  }

  async executeCustomAction(config, step, execution) {
    const script = config.script || ''
    const context = {
      variables: execution.variables,
      stepResults: Object.fromEntries(execution.stepResults),
      logs: [],
      output: null
    }

    try {
      const userScript = new Function(
        'context',
        `
          ${script}
          return context.output;
        `
      )
      
      const output = userScript(context)
      
      context.logs.forEach(log => {
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: log.level || 'info',
          stepId: step.id,
          message: log.message
        })
      })

      return {
        success: true,
        content: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
        data: {
          scriptOutput: output,
          customLogs: context.logs
        }
      }
    } catch (error) {
      throw new Error(`自定义脚本执行失败: ${error.message}`)
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getNextReadyStep(execution) {
    const steps = execution.workflowSnapshot.steps
    
    for (const step of steps) {
      const stepStatus = execution.stepStatuses.get(step.id)
      
      if (!stepStatus) continue
      if (stepStatus.status !== StepStatus.PENDING) continue
      
      const dependenciesMet = step.dependsOn.every(depId => {
        const depStatus = execution.stepStatuses.get(depId)
        return depStatus && depStatus.status === StepStatus.COMPLETED
      })
      
      if (dependenciesMet) {
        return step
      }
    }
    
    return null
  }

  checkAllStepsCompleted(execution) {
    const steps = execution.workflowSnapshot.steps
    return steps.every(step => {
      const status = execution.stepStatuses.get(step.id)
      return status && (status.status === StepStatus.COMPLETED || status.status === StepStatus.SKIPPED)
    })
  }

  checkAnyStepFailed(execution) {
    const steps = execution.workflowSnapshot.steps
    return steps.some(step => {
      const status = execution.stepStatuses.get(step.id)
      return status && status.status === StepStatus.FAILED
    })
  }

  async execute(executionId, engine) {
    const execution = this.runningExecutions.get(executionId)
    
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    if (execution.status === WorkflowStatus.RUNNING) {
      throw new Error(`Execution is already running: ${executionId}`)
    }

    execution.status = WorkflowStatus.RUNNING
    execution.startTime = Date.now()

    this.notify(executionId, {
      type: 'workflow_started',
      workflowId: execution.workflowId,
      workflowName: execution.workflowSnapshot.name,
      timestamp: new Date().toISOString()
    })

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `工作流开始执行: ${execution.workflowSnapshot.name}`
    })

    try {
      while (execution.status === WorkflowStatus.RUNNING) {
        if (this.checkAnyStepFailed(execution)) {
          throw new Error('部分步骤执行失败')
        }

        if (this.checkAllStepsCompleted(execution)) {
          break
        }

        const nextStep = this.getNextReadyStep(execution)
        
        if (!nextStep) {
          execution.logs.push({
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: '没有可执行的步骤，工作流可能处于阻塞状态'
          })
          await this.delay(1000)
          continue
        }

        await this.executeStep(nextStep, execution, engine)
      }

      execution.status = WorkflowStatus.COMPLETED
      execution.endTime = Date.now()

      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `工作流执行完成: ${execution.workflowSnapshot.name}`
      })

      this.notify(executionId, {
        type: 'workflow_completed',
        workflowId: execution.workflowId,
        workflowName: execution.workflowSnapshot.name,
        duration: execution.endTime - execution.startTime,
        timestamp: new Date().toISOString()
      })

      return {
        success: true,
        executionId,
        status: WorkflowStatus.COMPLETED,
        logs: execution.logs,
        results: Object.fromEntries(execution.stepResults)
      }

    } catch (error) {
      execution.status = WorkflowStatus.FAILED
      execution.endTime = Date.now()
      execution.error = error.message

      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `工作流执行失败: ${error.message}`
      })

      this.notify(executionId, {
        type: 'workflow_failed',
        workflowId: execution.workflowId,
        workflowName: execution.workflowSnapshot.name,
        error: error.message,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        executionId,
        status: WorkflowStatus.FAILED,
        error: error.message,
        logs: execution.logs
      }
    } finally {
      this.runningExecutions.delete(executionId)
    }
  }

  pause(executionId) {
    const execution = this.runningExecutions.get(executionId)
    if (execution) {
      execution.status = WorkflowStatus.PAUSED
      this.notify(executionId, {
        type: 'workflow_paused',
        timestamp: new Date().toISOString()
      })
      return true
    }
    return false
  }

  resume(executionId) {
    const execution = this.runningExecutions.get(executionId)
    if (execution && execution.status === WorkflowStatus.PAUSED) {
      execution.status = WorkflowStatus.RUNNING
      this.notify(executionId, {
        type: 'workflow_resumed',
        timestamp: new Date().toISOString()
      })
      return true
    }
    return false
  }

  cancel(executionId) {
    const execution = this.runningExecutions.get(executionId)
    if (execution) {
      execution.status = WorkflowStatus.CANCELLED
      execution.endTime = Date.now()
      
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: '工作流被取消'
      })

      this.notify(executionId, {
        type: 'workflow_cancelled',
        timestamp: new Date().toISOString()
      })

      this.runningExecutions.delete(executionId)
      return true
    }
    return false
  }

  startExecution(execution, engine) {
    this.runningExecutions.set(execution.id, execution)
    return this.execute(execution.id, engine)
  }

  isRunning(executionId) {
    const execution = this.runningExecutions.get(executionId)
    return execution && execution.status === WorkflowStatus.RUNNING
  }
}

export const workflowExecutor = new WorkflowExecutor()
