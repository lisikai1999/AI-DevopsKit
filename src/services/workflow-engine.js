export const WorkflowStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
}

export const ActionType = {
  GENERATE_CICD_CONFIG: 'generate_cicd_config',
  ANALYZE_DOCKERFILE: 'analyze_dockerfile',
  ANALYZE_CICD_CONFIG: 'analyze_cicd_config',
  ANALYZE_BILLING: 'analyze_billing',
  TRANSLATE_LOG: 'translate_log',
  GENERATE_JENKINSFILE: 'generate_jenkinsfile',
  CUSTOM_ACTION: 'custom_action',
  CONDITION: 'condition',
  PARALLEL: 'parallel',
  DELAY: 'delay',
  WEBHOOK: 'webhook'
}

export const ActionTypeInfo = {
  [ActionType.GENERATE_CICD_CONFIG]: {
    name: '生成 CI/CD 配置',
    description: '根据参数生成 CI/CD 配置文件',
    icon: '📦',
    category: '构建'
  },
  [ActionType.ANALYZE_DOCKERFILE]: {
    name: '分析 Dockerfile',
    description: '分析 Dockerfile 的安全性和性能',
    icon: '🐳',
    category: '分析'
  },
  [ActionType.ANALYZE_CICD_CONFIG]: {
    name: '诊断 CI/CD 配置',
    description: '检测 CI/CD 配置中的问题',
    icon: '🔍',
    category: '分析'
  },
  [ActionType.ANALYZE_BILLING]: {
    name: '账单分析',
    description: '分析云服务账单',
    icon: '💰',
    category: '分析'
  },
  [ActionType.TRANSLATE_LOG]: {
    name: '日志翻译',
    description: '翻译和解释技术日志',
    icon: '📝',
    category: '分析'
  },
  [ActionType.GENERATE_JENKINSFILE]: {
    name: '生成 Jenkinsfile',
    description: '生成 Jenkins 流水线配置',
    icon: '🏗️',
    category: '构建'
  },
  [ActionType.CUSTOM_ACTION]: {
    name: '自定义动作',
    description: '自定义的工作流动作',
    icon: '⚙️',
    category: '自定义'
  },
  [ActionType.CONDITION]: {
    name: '条件判断',
    description: '根据条件选择执行路径',
    icon: '🔀',
    category: '控制'
  },
  [ActionType.PARALLEL]: {
    name: '并行执行',
    description: '并行执行多个步骤',
    icon: '⚡',
    category: '控制'
  },
  [ActionType.DELAY]: {
    name: '延迟等待',
    description: '延迟一段时间后继续执行',
    icon: '⏰',
    category: '控制'
  },
  [ActionType.WEBHOOK]: {
    name: 'Webhook 调用',
    description: '调用外部 Webhook',
    icon: '🔗',
    category: '集成'
  }
}

export class WorkflowEngine {
  constructor() {
    this.workflows = new Map()
    this.executions = new Map()
  }

  createWorkflow(workflowData) {
    const workflow = {
      id: workflowData.id || `workflow_${Date.now()}`,
      name: workflowData.name || '未命名工作流',
      description: workflowData.description || '',
      templateId: workflowData.templateId || null,
      steps: workflowData.steps || [],
      variables: workflowData.variables || {},
      triggers: workflowData.triggers || [],
      settings: workflowData.settings || {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 300000
      },
      createdAt: workflowData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: workflowData.version || 1
    }

    this.workflows.set(workflow.id, workflow)
    return workflow
  }

  updateWorkflow(workflowId, updates) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: workflow.version + 1
    }

    this.workflows.set(workflowId, updatedWorkflow)
    return updatedWorkflow
  }

  getWorkflow(workflowId) {
    return this.workflows.get(workflowId)
  }

  getAllWorkflows() {
    return Array.from(this.workflows.values())
  }

  deleteWorkflow(workflowId) {
    return this.workflows.delete(workflowId)
  }

  addStep(workflowId, stepData, position = null) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const step = {
      id: stepData.id || `step_${Date.now()}`,
      name: stepData.name || '未命名步骤',
      actionType: stepData.actionType || ActionType.CUSTOM_ACTION,
      config: stepData.config || {},
      conditions: stepData.conditions || [],
      retryPolicy: stepData.retryPolicy || {
        enabled: false,
        maxRetries: 3,
        delay: 1000
      },
      timeout: stepData.timeout || 300000,
      description: stepData.description || '',
      dependsOn: stepData.dependsOn || []
    }

    if (position !== null && position >= 0 && position <= workflow.steps.length) {
      workflow.steps.splice(position, 0, step)
    } else {
      workflow.steps.push(step)
    }

    workflow.updatedAt = new Date().toISOString()
    this.workflows.set(workflowId, workflow)
    return step
  }

  removeStep(workflowId, stepId) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const index = workflow.steps.findIndex(s => s.id === stepId)
    if (index !== -1) {
      workflow.steps.splice(index, 1)
      workflow.updatedAt = new Date().toISOString()
      this.workflows.set(workflowId, workflow)
      return true
    }
    return false
  }

  updateStep(workflowId, stepId, updates) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const stepIndex = workflow.steps.findIndex(s => s.id === stepId)
    if (stepIndex === -1) {
      throw new Error(`Step not found: ${stepId}`)
    }

    workflow.steps[stepIndex] = {
      ...workflow.steps[stepIndex],
      ...updates
    }
    workflow.updatedAt = new Date().toISOString()
    this.workflows.set(workflowId, workflow)
    return workflow.steps[stepIndex]
  }

  reorderSteps(workflowId, stepOrder) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const stepMap = new Map(workflow.steps.map(s => [s.id, s]))
    const newSteps = stepOrder.map(id => stepMap.get(id)).filter(Boolean)

    if (newSteps.length !== workflow.steps.length) {
      throw new Error('Invalid step order: some steps missing')
    }

    workflow.steps = newSteps
    workflow.updatedAt = new Date().toISOString()
    this.workflows.set(workflowId, workflow)
    return workflow
  }

  validateWorkflow(workflow) {
    const issues = []

    if (!workflow.name || workflow.name.trim() === '') {
      issues.push({
        type: 'error',
        message: '工作流名称不能为空',
        field: 'name'
      })
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      issues.push({
        type: 'warning',
        message: '工作流没有任何步骤',
        field: 'steps'
      })
    }

    const stepIds = new Set()
    workflow.steps.forEach((step, index) => {
      if (stepIds.has(step.id)) {
        issues.push({
          type: 'error',
          message: `步骤 ${step.id} 重复定义`,
          field: `steps[${index}].id`
        })
      }
      stepIds.add(step.id)

      if (!ActionTypeInfo[step.actionType]) {
        issues.push({
          type: 'error',
          message: `步骤 ${step.name} 使用了未知的动作类型: ${step.actionType}`,
          field: `steps[${index}].actionType`
        })
      }

      step.dependsOn.forEach(depId => {
        if (!stepIds.has(depId)) {
          issues.push({
            type: 'warning',
            message: `步骤 ${step.name} 依赖的步骤 ${depId} 不存在`,
            field: `steps[${index}].dependsOn`
          })
        }
      })
    })

    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues
    }
  }

  exportWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    return JSON.stringify({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      templateId: workflow.templateId,
      steps: workflow.steps,
      variables: workflow.variables,
      triggers: workflow.triggers,
      settings: workflow.settings,
      version: workflow.version,
      exportedAt: new Date().toISOString()
    }, null, 2)
  }

  importWorkflow(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      return this.createWorkflow(data)
    } catch (error) {
      throw new Error(`Failed to import workflow: ${error.message}`)
    }
  }

  createExecution(workflowId, runtimeVariables = {}) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflowId,
      workflowSnapshot: JSON.parse(JSON.stringify(workflow)),
      status: WorkflowStatus.IDLE,
      variables: {
        ...workflow.variables,
        ...runtimeVariables
      },
      stepResults: new Map(),
      stepStatuses: new Map(),
      logs: [],
      startTime: null,
      endTime: null,
      currentStepIndex: 0,
      error: null,
      createdAt: new Date().toISOString()
    }

    workflow.steps.forEach(step => {
      execution.stepStatuses.set(step.id, {
        status: StepStatus.PENDING,
        startTime: null,
        endTime: null,
        retries: 0,
        error: null
      })
    })

    this.executions.set(execution.id, execution)
    return execution
  }

  getExecution(executionId) {
    return this.executions.get(executionId)
  }

  getAllExecutions() {
    return Array.from(this.executions.values())
  }

  getExecutionProgress(executionId) {
    const execution = this.executions.get(executionId)
    if (!execution) {
      return null
    }

    const totalSteps = execution.workflowSnapshot.steps.length
    const completedSteps = Array.from(execution.stepStatuses.values()).filter(
      s => s.status === StepStatus.COMPLETED
    ).length
    const failedSteps = Array.from(execution.stepStatuses.values()).filter(
      s => s.status === StepStatus.FAILED
    ).length

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      runningSteps: Array.from(execution.stepStatuses.values()).filter(
        s => s.status === StepStatus.RUNNING
      ).length,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime
    }
  }
}

export const workflowEngine = new WorkflowEngine()
