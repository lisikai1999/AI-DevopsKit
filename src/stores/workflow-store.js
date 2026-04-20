import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { workflowEngine, WorkflowStatus } from '@/services/workflow-engine'
import { createWorkflowFromTemplate, getAllTemplates } from '@/services/workflow-templates'
import { workflowExecutor } from '@/services/workflow-executor'

export const useWorkflowStore = defineStore('workflow', () => {
  const workflows = ref([])
  const currentWorkflow = ref(null)
  const currentExecution = ref(null)
  const executionLogs = ref([])
  const templates = ref([])
  const selectedTemplate = ref(null)
  const isLoading = ref(false)
  const executionProgress = ref(null)

  const workflowCount = computed(() => workflows.value.length)
  const activeWorkflows = computed(() => workflows.value.filter(w => !w.archived))

  function loadTemplates() {
    try {
      templates.value = getAllTemplates()
    } catch (error) {
      console.error('[WorkflowStore] 加载模板失败:', error)
    }
  }

  function loadWorkflows() {
    try {
      const saved = localStorage.getItem('ai-devops-workflows')
      if (saved) {
        workflows.value = JSON.parse(saved)
        workflows.value.forEach(workflow => {
          workflowEngine.registerWorkflow(workflow)
        })
      }
    } catch (error) {
      console.error('[WorkflowStore] 加载工作流失败:', error)
    }
  }

  function saveWorkflows() {
    try {
      localStorage.setItem('ai-devops-workflows', JSON.stringify(workflows.value))
    } catch (error) {
      console.error('[WorkflowStore] 保存工作流失败:', error)
    }
  }

  function createWorkflow(templateId, customizations = {}) {
    try {
      const workflowData = createWorkflowFromTemplate(templateId, customizations)
      workflows.value.push(workflowData)
      workflowEngine.registerWorkflow(workflowData)
      saveWorkflows()
      return workflowData
    } catch (error) {
      throw error
    }
  }

  function createEmptyWorkflow(name, description = '') {
    const workflow = {
      id: `workflow_${Date.now()}`,
      name,
      description,
      templateId: null,
      steps: [],
      variables: {},
      settings: {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 600000
      },
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    workflows.value.push(workflow)
    workflowEngine.registerWorkflow(workflow)
    saveWorkflows()
    return workflow
  }

  function getWorkflow(id) {
    return workflows.value.find(w => w.id === id)
  }

  function updateWorkflow(id, updates) {
    const index = workflows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workflows.value[index] = {
        ...workflows.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      workflowEngine.registerWorkflow(workflows.value[index])
      saveWorkflows()
      return workflows.value[index]
    }
    return null
  }

  function deleteWorkflow(id) {
    const index = workflows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workflows.value.splice(index, 1)
      workflowEngine.deleteWorkflow(id)
      saveWorkflows()
      return true
    }
    return false
  }

  function setCurrentWorkflow(id) {
    currentWorkflow.value = workflows.value.find(w => w.id === id) || null
  }

  function addStep(workflowId, stepData) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const step = {
        id: `step_${Date.now()}`,
        name: stepData.name || '未命名步骤',
        actionType: stepData.actionType,
        config: stepData.config || {},
        description: stepData.description || '',
        dependsOn: stepData.dependsOn || [],
        retryPolicy: stepData.retryPolicy || {
          enabled: false,
          maxRetries: 3,
          delay: 1000
        },
        timeout: stepData.timeout || 300000
      }
      workflow.steps.push(step)
      workflow.updatedAt = new Date().toISOString()
      workflowEngine.registerWorkflow(workflow)
      saveWorkflows()
      return step
    }
    return null
  }

  function updateStep(workflowId, stepId, updates) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const stepIndex = workflow.steps.findIndex(s => s.id === stepId)
      if (stepIndex !== -1) {
        workflow.steps[stepIndex] = {
          ...workflow.steps[stepIndex],
          ...updates
        }
        workflow.updatedAt = new Date().toISOString()
        workflowEngine.registerWorkflow(workflow)
        saveWorkflows()
        return workflow.steps[stepIndex]
      }
    }
    return null
  }

  function removeStep(workflowId, stepId) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const index = workflow.steps.findIndex(s => s.id === stepId)
      if (index !== -1) {
        workflow.steps.splice(index, 1)
        
        workflow.steps.forEach(step => {
          const depIndex = step.dependsOn.indexOf(stepId)
          if (depIndex !== -1) {
            step.dependsOn.splice(depIndex, 1)
          }
        })
        
        workflow.updatedAt = new Date().toISOString()
        workflowEngine.registerWorkflow(workflow)
        saveWorkflows()
        return true
      }
    }
    return false
  }

  function reorderSteps(workflowId, stepOrder) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const stepMap = new Map(workflow.steps.map(s => [s.id, s]))
      const newSteps = stepOrder.map(id => stepMap.get(id)).filter(Boolean)
      
      if (newSteps.length === workflow.steps.length) {
        workflow.steps = newSteps
        workflow.updatedAt = new Date().toISOString()
        workflowEngine.registerWorkflow(workflow)
        saveWorkflows()
        return true
      }
    }
    return false
  }

  function duplicateWorkflow(workflowId) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const newWorkflow = JSON.parse(JSON.stringify(workflow))
      newWorkflow.id = `workflow_${Date.now()}`
      newWorkflow.name = `${workflow.name} (副本)`
      newWorkflow.createdAt = new Date().toISOString()
      newWorkflow.updatedAt = new Date().toISOString()
      
      workflows.value.push(newWorkflow)
      workflowEngine.registerWorkflow(newWorkflow)
      saveWorkflows()
      return newWorkflow
    }
    return null
  }

  function exportWorkflow(workflowId) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const exportData = {
        ...workflow,
        exportedAt: new Date().toISOString()
      }
      return JSON.stringify(exportData, null, 2)
    }
    return null
  }

  function importWorkflow(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      const newWorkflow = {
        ...data,
        id: `workflow_${Date.now()}`
      }
      delete newWorkflow.exportedAt
      
      workflows.value.push(newWorkflow)
      workflowEngine.registerWorkflow(newWorkflow)
      saveWorkflows()
      return newWorkflow
    } catch (error) {
      throw new Error(`导入失败: ${error.message}`)
    }
  }

  async function executeWorkflow(workflowId, runtimeVariables = {}) {
    const workflow = getWorkflow(workflowId)
    if (!workflow) {
      throw new Error('工作流不存在')
    }

    isLoading.value = true
    executionLogs.value = []
    
    try {
      workflowEngine.registerWorkflow(workflow)
      
      const execution = workflowEngine.createExecution(workflowId, runtimeVariables)
      currentExecution.value = execution
      
      workflowExecutor.subscribe(execution.id, (event) => {
        executionLogs.value.push({
          ...event,
          timestamp: event.timestamp || new Date().toISOString()
        })
        
        if (event.type === 'step_started') {
          executionProgress.value = workflowEngine.getExecutionProgress(execution.id)
        }
      })
      
      const result = await workflowExecutor.startExecution(execution, workflowEngine)
      
      isLoading.value = false
      
      executionProgress.value = workflowEngine.getExecutionProgress(execution.id)
      
      return result
      
    } catch (error) {
      isLoading.value = false
      throw error
    }
  }

  function getExecutionLogs() {
    return executionLogs.value
  }

  function clearExecutionState() {
    currentExecution.value = null
    executionLogs.value = []
    executionProgress.value = null
  }

  function setSelectedTemplate(templateId) {
    if (templateId) {
      selectedTemplate.value = templates.value.find(t => t.id === templateId) || null
    } else {
      selectedTemplate.value = null
    }
  }

  return {
    workflows,
    currentWorkflow,
    currentExecution,
    executionLogs,
    templates,
    selectedTemplate,
    isLoading,
    executionProgress,
    workflowCount,
    activeWorkflows,
    loadTemplates,
    loadWorkflows,
    saveWorkflows,
    createWorkflow,
    createEmptyWorkflow,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow,
    setCurrentWorkflow,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    duplicateWorkflow,
    exportWorkflow,
    importWorkflow,
    executeWorkflow,
    getExecutionLogs,
    clearExecutionState,
    setSelectedTemplate
  }
})
