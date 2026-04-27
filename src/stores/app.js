import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { generationsApi, ApiError } from '@/services/api'

/**
 * 历史记录项的结构说明（替代TS的interface）
 * @typedef {Object} HistoryItem
 * @property {string | number} id - 唯一标识
 * @property {'jenkinsfile' | 'dockerfile' | 'billing' | 'log' | 'cicd'} type - 类型
 * @property {string} title - 标题
 * @property {string} content - 内容
 * @property {string} [result] - 结果（可选）
 * @property {string} createdAt - 创建时间
 */

const mapBackendType = (backendType) => {
  const typeMap = {
    'JENKINSFILE': 'jenkinsfile',
    'DOCKERFILE': 'dockerfile',
    'BILLING': 'billing',
    'LOG': 'log',
    'CICD': 'cicd'
  }
  return typeMap[backendType] || backendType?.toLowerCase() || backendType
}

const mapFrontendType = (frontendType) => {
  const typeMap = {
    'jenkinsfile': 'JENKINSFILE',
    'dockerfile': 'DOCKERFILE',
    'billing': 'BILLING',
    'log': 'LOG',
    'cicd': 'CICD',
    'cicd-scan': 'CICD'
  }
  return typeMap[frontendType] || frontendType?.toUpperCase() || frontendType
}

export const useAppStore = defineStore('app', () => {
  const isDarkMode = ref(false)
  const history = ref([])
  const historyLoaded = ref(false)
  const isLoadingHistory = ref(false)
  const useBackend = ref(false)
  
  const checkBackend = async () => {
    try {
      await generationsApi.list({ limit: 1 })
      useBackend.value = true
      return true
    } catch (error) {
      useBackend.value = false
      return false
    }
  }
  
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
  }
  
  /**
   * 添加历史记录
   * @param {Omit<HistoryItem, 'id' | 'createdAt'>} item - 历史记录项
   */
  const addToHistory = async (item) => {
    await checkBackend()
    
    if (useBackend.value) {
      try {
        const generationType = mapFrontendType(item.type)
        
        const newItem = {
          title: item.title,
          type: generationType,
          content: item.content || '',
          result: typeof item.result === 'object' ? JSON.stringify(item.result) : (item.result || null),
          parameters: {},
          meta: {}
        }
        
        const saved = await generationsApi.create(newItem)
        
        const frontendItem = {
          ...saved,
          type: mapBackendType(saved.type),
          createdAt: saved.created_at
        }
        
        history.value.unshift(frontendItem)
        return frontendItem
      } catch (error) {
        console.error('Failed to save generation to backend:', error)
      }
    }
    
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    history.value.unshift(newItem)
    
    if (history.value.length > 50) {
      history.value = history.value.slice(0, 50)
    }
    
    localStorage.setItem('ai-devops-history', JSON.stringify(history.value))
    return newItem
  }
  
  const loadHistory = async (force = false) => {
    if (!force && historyLoaded.value) {
      return
    }
    
    isLoadingHistory.value = true
    
    const hasBackend = await checkBackend()
    
    if (hasBackend) {
      try {
        const generations = await generationsApi.list({ limit: 100 })
        history.value = generations.map(g => ({
          ...g,
          type: mapBackendType(g.type),
          createdAt: g.created_at
        }))
        historyLoaded.value = true
        return
      } catch (error) {
        console.error('Failed to load from backend:', error)
        useBackend.value = false
      }
    }
    
    const saved = localStorage.getItem('ai-devops-history')
    if (saved) {
      history.value = JSON.parse(saved)
    }
    historyLoaded.value = true
    isLoadingHistory.value = false
  }
  
  const clearHistory = async () => {
    if (useBackend.value) {
      try {
        const all = [...history.value]
        for (const item of all) {
          if (typeof item.id === 'number') {
            await generationsApi.delete(item.id)
          }
        }
      } catch (error) {
        console.error('Failed to clear from backend:', error)
      }
    }
    
    history.value = []
    localStorage.removeItem('ai-devops-history')
  }
  
  /**
   * 删除指定id的历史记录
   * @param {string | number} id - 历史记录的id
   */
  const deleteHistoryItem = async (id) => {
    if (useBackend.value && typeof id === 'number') {
      try {
        await generationsApi.delete(id)
      } catch (error) {
        console.error('Failed to delete from backend:', error)
      }
    }
    
    history.value = history.value.filter(item => item.id !== id)
    
    const localItems = history.value.filter(item => typeof item.id === 'string')
    localStorage.setItem('ai-devops-history', JSON.stringify(localItems))
  }
  
  /**
   * 更新指定id的历史记录
   * @param {string | number} id - 历史记录的id
   * @param {Partial<HistoryItem>} updates - 更新的内容
   */
  const updateHistoryItem = async (id, updates) => {
    if (useBackend.value && typeof id === 'number') {
      try {
        const updateData = {}
        if (updates.content !== undefined) updateData.content = updates.content
        if (updates.result !== undefined) updateData.result = updates.result
        if (updates.title !== undefined) updateData.title = updates.title
        
        await generationsApi.update(id, updateData)
      } catch (error) {
        console.error('Failed to update in backend:', error)
      }
    }
    
    const index = history.value.findIndex(item => item.id === id)
    if (index !== -1) {
      history.value[index] = {
        ...history.value[index],
        ...updates,
        createdAt: new Date().toISOString()
      }
      
      const localItems = history.value.filter(item => typeof item.id === 'string')
      localStorage.setItem('ai-devops-history', JSON.stringify(localItems))
    }
  }
  
  return {
    isDarkMode,
    history,
    historyLoaded,
    isLoadingHistory,
    useBackend,
    toggleDarkMode,
    addToHistory,
    loadHistory,
    clearHistory,
    deleteHistoryItem,
    updateHistoryItem
  }
})