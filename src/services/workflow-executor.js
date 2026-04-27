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
      
      if (stepResults && stepResults[trimmedKey] !== undefined) {
        const stepResult = stepResults[trimmedKey]
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
          if (current && current[parts[i]] !== undefined) {
            current = current[parts[i]]
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

        case ActionType.JENKINS_EXECUTE:
          result = await this.executeJenkinsExecute(config, step, execution)
          break

        case ActionType.AWS_ECS_CHECK:
          result = await this.executeAwsEcsCheck(config, step, execution)
          break

        case ActionType.WEWORK_NOTIFICATION:
          result = await this.executeWeworkNotification(config, step, execution)
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
      
      execution.stepStatuses[subStepId] = {
        status: StepStatus.PENDING,
        startTime: null,
        endTime: null,
        retries: 0,
        error: null
      }

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
      
      execution.stepStatuses[subStepId] = {
        status: StepStatus.PENDING,
        startTime: null,
        endTime: null,
        retries: 0,
        error: null
      }

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

  async executeJenkinsExecute(config, step, execution) {
    const jenkinsUrl = config.jenkinsUrl
    const jobName = config.jobName
    const username = config.username
    const apiToken = config.apiToken
    const parameters = config.parameters || {}
    const waitForBuild = config.waitForBuild !== false
    const pollInterval = config.pollInterval || 5000
    const timeout = config.timeout || 300000

    if (!jenkinsUrl || !jobName) {
      throw new Error('Jenkins URL 和 Job 名称为必填项')
    }

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId: step.id,
      message: `触发 Jenkins 任务: ${jobName}`
    })

    const authHeader = username && apiToken 
      ? 'Basic ' + btoa(`${username}:${apiToken}`)
      : null

    try {
      let buildUrl = null
      let buildNumber = null

      const triggerUrl = `${jenkinsUrl}/job/${encodeURIComponent(jobName)}/buildWithParameters`
      const triggerHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
      if (authHeader) {
        triggerHeaders['Authorization'] = authHeader
      }

      const triggerConfig = {
        method: 'POST',
        url: triggerUrl,
        headers: triggerHeaders,
        data: new URLSearchParams(parameters).toString(),
        timeout: 30000
      }

      const triggerResponse = await axios(triggerConfig)

      if (triggerResponse.status === 201) {
        const queueUrl = triggerResponse.headers.location
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: `任务已加入构建队列: ${queueUrl}`
        })

        if (waitForBuild) {
          buildUrl = await this.waitForJenkinsBuildStart(
            jenkinsUrl, queueUrl, authHeader, pollInterval, timeout
          )
          
          if (buildUrl) {
            buildNumber = parseInt(buildUrl.match(/\/(\d+)\/$/)?.[1] || '0')
            execution.logs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              stepId: step.id,
              message: `构建开始，构建号: ${buildNumber}`
            })

            const buildResult = await this.waitForJenkinsBuildComplete(
              buildUrl, authHeader, pollInterval, timeout
            )

            execution.logs.push({
              timestamp: new Date().toISOString(),
              level: buildResult.success ? 'info' : 'error',
              stepId: step.id,
              message: `构建完成，结果: ${buildResult.result}`
            })

            return {
              success: buildResult.success,
              content: `Jenkins 构建完成: ${buildResult.result}`,
              data: {
                jenkinsUrl,
                jobName,
                buildNumber,
                buildUrl,
                result: buildResult.result,
                success: buildResult.success,
                duration: buildResult.duration,
                consoleUrl: `${buildUrl}console`
              }
            }
          }
        }
      }

      return {
        success: true,
        content: 'Jenkins 任务已触发',
        data: {
          jenkinsUrl,
          jobName,
          buildTriggered: true,
          waitForBuild
        }
      }

    } catch (error) {
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        stepId: step.id,
        message: `Jenkins 任务执行失败: ${error.message}`
      })
      throw error
    }
  }

  async waitForJenkinsBuildStart(jenkinsUrl, queueUrl, authHeader, pollInterval, timeout) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const queueInfoUrl = `${queueUrl}/api/json`
        const queueHeaders = {}
        if (authHeader) {
          queueHeaders['Authorization'] = authHeader
        }

        const response = await axios({
          method: 'GET',
          url: queueInfoUrl,
          headers: queueHeaders,
          timeout: 10000
        })

        if (response.data.executable) {
          return response.data.executable.url
        }

        if (response.data.cancelled) {
          throw new Error('构建任务已取消')
        }

      } catch (error) {
        if (error.message.includes('已取消')) {
          throw error
        }
      }

      await this.delay(pollInterval)
    }

    throw new Error('等待构建启动超时')
  }

  async waitForJenkinsBuildComplete(buildUrl, authHeader, pollInterval, timeout) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const buildInfoUrl = `${buildUrl}api/json`
        const buildHeaders = {}
        if (authHeader) {
          buildHeaders['Authorization'] = authHeader
        }

        const response = await axios({
          method: 'GET',
          url: buildInfoUrl,
          headers: buildHeaders,
          timeout: 10000
        })

        if (response.data.building === false) {
          return {
            result: response.data.result,
            success: response.data.result === 'SUCCESS',
            duration: response.data.duration
          }
        }

      } catch (error) {
        console.error('轮询构建状态失败:', error)
      }

      await this.delay(pollInterval)
    }

    throw new Error('等待构建完成超时')
  }

  async executeAwsEcsCheck(config, step, execution) {
    const region = config.region
    const cluster = config.cluster
    const serviceName = config.serviceName
    const expectedCount = config.expectedCount
    const checkInterval = config.checkInterval || 30000
    const maxRetries = config.maxRetries || 10
    const accessKeyId = config.accessKeyId
    const secretAccessKey = config.secretAccessKey

    if (!region || !cluster || !serviceName) {
      throw new Error('AWS 区域、集群名称和服务名称为必填项')
    }

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId: step.id,
      message: `检查 ECS 服务: ${cluster}/${serviceName} (区域: ${region})`
    })

    let lastStatus = null
    let lastRunningCount = 0
    let lastDesiredCount = 0

    for (let i = 0; i < maxRetries; i++) {
      try {
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: `第 ${i + 1}/${maxRetries} 次检查 ECS 服务状态...`
        })

        const serviceStatus = await this.getEcsServiceStatus(
          region, cluster, serviceName, accessKeyId, secretAccessKey
        )

        lastStatus = serviceStatus.status
        lastRunningCount = serviceStatus.runningCount
        lastDesiredCount = serviceStatus.desiredCount

        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: `服务状态: ${serviceStatus.status}, 运行中: ${serviceStatus.runningCount}/${serviceStatus.desiredCount}, 待部署: ${serviceStatus.pendingCount}`
        })

        const checkResult = this.evaluateEcsServiceStatus(
          serviceStatus, 
          expectedCount
        )

        if (checkResult.ready) {
          execution.logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            stepId: step.id,
            message: `ECS 服务更新检验通过: ${checkResult.message}`
          })

          return {
            success: true,
            content: `ECS 服务更新检验通过: ${checkResult.message}`,
            data: {
              region,
              cluster,
              serviceName,
              status: serviceStatus.status,
              runningCount: serviceStatus.runningCount,
              desiredCount: serviceStatus.desiredCount,
              pendingCount: serviceStatus.pendingCount,
              events: serviceStatus.events,
              taskDefinition: serviceStatus.taskDefinition
            }
          }
        }

        if (checkResult.failed) {
          execution.logs.push({
            timestamp: new Date().toISOString(),
            level: 'error',
            stepId: step.id,
            message: `ECS 服务更新失败: ${checkResult.message}`
          })
          throw new Error(checkResult.message)
        }

        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: `服务更新中，等待 ${checkInterval / 1000} 秒后再次检查...`
        })

        if (i < maxRetries - 1) {
          await this.delay(checkInterval)
        }

      } catch (error) {
        if (error.message.includes('ECS 服务更新失败')) {
          throw error
        }
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'warn',
          stepId: step.id,
          message: `检查 ECS 服务失败: ${error.message}, 继续重试...`
        })
        
        if (i < maxRetries - 1) {
          await this.delay(checkInterval)
        }
      }
    }

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      stepId: step.id,
      message: `ECS 服务更新检验超时，当前状态: ${lastStatus}, 运行中: ${lastRunningCount}/${lastDesiredCount}`
    })

    throw new Error(`ECS 服务更新检验超时，当前状态: ${lastStatus}, 运行中: ${lastRunningCount}/${lastDesiredCount}`)
  }

  async getEcsServiceStatus(region, cluster, serviceName, accessKeyId, secretAccessKey) {
    const mockStatus = {
      status: 'ACTIVE',
      runningCount: 2,
      desiredCount: 2,
      pendingCount: 0,
      taskDefinition: 'task-def:123',
      events: [
        {
          message: `service ${serviceName} has reached a steady state.`,
          createdAt: new Date().toISOString()
        }
      ]
    }

    if (accessKeyId && secretAccessKey) {
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId: 'ecs_check',
        message: `使用 AWS 凭证: ${accessKeyId.substring(0, 10)}...`
      })
    }

    return mockStatus
  }

  evaluateEcsServiceStatus(serviceStatus, expectedCount) {
    const desiredCount = expectedCount !== undefined ? expectedCount : serviceStatus.desiredCount
    const runningCount = serviceStatus.runningCount
    const pendingCount = serviceStatus.pendingCount
    const status = serviceStatus.status

    if (status === 'DRAINING') {
      return { ready: false, failed: false, message: '服务正在 draining，等待完成...' }
    }

    if (status === 'INACTIVE') {
      return { ready: false, failed: true, message: '服务已停止' }
    }

    if (runningCount === desiredCount && pendingCount === 0) {
      return { ready: true, failed: false, message: `所有 ${runningCount} 个任务已运行，服务达到稳定状态` }
    }

    if (pendingCount > 0) {
      return { ready: false, failed: false, message: `有 ${pendingCount} 个任务正在部署中，运行中: ${runningCount}/${desiredCount}` }
    }

    if (runningCount < desiredCount) {
      return { ready: false, failed: false, message: `运行中任务数不足: ${runningCount}/${desiredCount}，等待更多任务启动...` }
    }

    if (runningCount > desiredCount) {
      return { ready: false, failed: false, message: `运行中任务数过多: ${runningCount}/${desiredCount}，等待多余任务终止...` }
    }

    return { ready: false, failed: false, message: `状态检查中: 运行中 ${runningCount}/${desiredCount}` }
  }

  async executeWeworkNotification(config, step, execution) {
    const webhookUrl = config.webhookUrl
    const messageType = config.messageType || 'text'
    const content = config.content
    const title = config.title
    const description = config.description
    const url = config.url
    const picUrl = config.picUrl
    const mentions = config.mentions || []
    const mentionAll = config.mentionAll || false

    if (!webhookUrl) {
      throw new Error('企业微信机器人 Webhook URL 为必填项')
    }

    let payload = {}

    switch (messageType) {
      case 'text':
        if (!content) {
          throw new Error('文本消息类型需要提供 content')
        }
        payload = {
          msgtype: 'text',
          text: {
            content: content,
            mentioned_list: mentions,
            mentioned_mobile_list: []
          }
        }
        if (mentionAll) {
          payload.text.mentioned_list = ['@all']
        }
        break

      case 'markdown':
        if (!content) {
          throw new Error('Markdown 消息类型需要提供 content')
        }
        payload = {
          msgtype: 'markdown',
          markdown: {
            content: content
          }
        }
        break

      case 'news':
        if (!title || !description) {
          throw new Error('图文消息类型需要提供 title 和 description')
        }
        payload = {
          msgtype: 'news',
          news: {
            articles: [
              {
                title: title,
                description: description,
                url: url || '',
                picurl: picUrl || ''
              }
            ]
          }
        }
        break

      case 'template_card':
        payload = {
          msgtype: 'template_card',
          template_card: {
            card_type: 'text_notice',
            source: {
              icon_url: '',
              desc: '工作流通知',
              desc_color: 0
            },
            main_title: {
              title: title || '工作流执行通知',
              desc: description || ''
            },
            emphasis_content: {
              title: content || '',
              desc: ''
            },
            sub_title_text: '',
            horizontal_content_list: [],
            jump_list: url ? [
              {
                type: 1,
                url: url,
                title: '查看详情'
              }
            ] : [],
            card_action: url ? {
              type: 1,
              url: url
            } : undefined
          }
        }
        break

      default:
        if (!content) {
          throw new Error('消息内容为必填项')
        }
        payload = {
          msgtype: 'text',
          text: {
            content: content
          }
        }
    }

    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId: step.id,
      message: `发送企业微信通知，类型: ${messageType}`
    })

    try {
      const response = await axios({
        method: 'POST',
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: 30000
      })

      const responseData = response.data

      if (responseData.errcode === 0) {
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: '企业微信通知发送成功'
        })

        return {
          success: true,
          content: '企业微信通知发送成功',
          data: {
            messageType,
            webhookUrl: webhookUrl.substring(0, 50) + '...',
            errcode: responseData.errcode,
            errmsg: responseData.errmsg
          }
        }
      } else {
        throw new Error(`企业微信 API 返回错误: ${responseData.errmsg} (errcode: ${responseData.errcode})`)
      }

    } catch (error) {
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        stepId: step.id,
        message: `企业微信通知发送失败: ${error.message}`
      })
      throw error
    }
  }

  async executeCustomAction(config, step, execution) {
    const script = config.script || ''
    const context = {
      variables: execution.variables,
      stepResults: execution.stepResults,
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
      const stepStatus = execution.stepStatuses[step.id]
      
      if (!stepStatus) continue
      if (stepStatus.status !== StepStatus.PENDING) continue
      
      const dependenciesMet = step.dependsOn.every(depId => {
        const depStatus = execution.stepStatuses[depId]
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
      const status = execution.stepStatuses[step.id]
      return status && (status.status === StepStatus.COMPLETED || status.status === StepStatus.SKIPPED)
    })
  }

  checkAnyStepFailed(execution) {
    const steps = execution.workflowSnapshot.steps
    return steps.some(step => {
      const status = execution.stepStatuses[step.id]
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
        results: execution.stepResults
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
