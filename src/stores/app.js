import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 历史记录项的结构说明（替代TS的interface）
 * @typedef {Object} HistoryItem
 * @property {string} id - 唯一标识
 * @property {'jenkinsfile' | 'dockerfile'} type - 类型
 * @property {string} title - 标题
 * @property {string} content - 内容
 * @property {string} [result] - 结果（可选）
 * @property {string} createdAt - 创建时间
 */

export const useAppStore = defineStore('app', () => {
  const isDarkMode = ref(false)
  // 移除TS的类型注解，直接初始化空数组
  const history = ref([])
  
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
  }
  
  /**
   * 添加历史记录（替代TS的Omit泛型，用JSDoc说明参数）
   * @param {Omit<HistoryItem, 'id' | 'createdAt'>} item - 历史记录项（不含id和createdAt）
   */
  const addToHistory = (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    history.value.unshift(newItem)
    
    // 保持最近50条记录
    if (history.value.length > 50) {
      history.value = history.value.slice(0, 50)
    }
    
    // 保存到localStorage
    localStorage.setItem('ai-devops-history', JSON.stringify(history.value))
  }
  
  const loadHistory = () => {
    const saved = localStorage.getItem('ai-devops-history')
    if (saved) {
      history.value = JSON.parse(saved)
    }
  }
  
  const clearHistory = () => {
    history.value = []
    localStorage.removeItem('ai-devops-history')
  }
  
  /**
   * 删除指定id的历史记录
   * @param {string} id - 历史记录的id
   */
  const deleteHistoryItem = (id) => {
    history.value = history.value.filter(item => item.id !== id)
    localStorage.setItem('ai-devops-history', JSON.stringify(history.value))
  }
  
  return {
    isDarkMode,
    history,
    toggleDarkMode,
    addToHistory,
    loadHistory,
    clearHistory,
    deleteHistoryItem
  }
})