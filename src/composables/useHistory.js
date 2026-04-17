import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'

/**
 * 历史记录类型
 * @typedef {'jenkinsfile' | 'dockerfile' | 'billing' | 'log'} HistoryType
 */

/**
 * 历史记录项
 * @typedef {Object} HistoryItem
 * @property {string} id - 唯一标识
 * @property {HistoryType} type - 类型
 * @property {string} title - 标题
 * @property {string} content - 内容
 * @property {string} [result] - 结果（可选）
 * @property {string} createdAt - 创建时间
 */

/**
 * 获取历史记录类型对应的 Element Plus Tag 类型
 * @param {HistoryType} type - 历史记录类型
 * @returns {string} Element Plus Tag 类型
 */
export const getTagType = (type) => {
  switch (type) {
    case 'jenkinsfile':
      return 'primary'
    case 'dockerfile':
      return 'success'
    case 'billing':
      return 'warning'
    case 'log':
      return 'info'
    default:
      return 'info'
  }
}

/**
 * 获取历史记录类型对应的中文标签
 * @param {HistoryType} type - 历史记录类型
 * @returns {string} 中文标签
 */
export const getTypeLabel = (type) => {
  switch (type) {
    case 'jenkinsfile':
      return 'Jenkinsfile'
    case 'dockerfile':
      return 'Dockerfile'
    case 'billing':
      return '账单'
    case 'log':
      return '日志'
    default:
      return type
  }
}

/**
 * 获取历史记录类型对应的 Monaco Editor 语言
 * @param {HistoryType} type - 历史记录类型
 * @returns {string} Monaco Editor 语言标识
 */
export const getEditorLanguage = (type) => {
  switch (type) {
    case 'jenkinsfile':
      return 'groovy'
    case 'dockerfile':
      return 'dockerfile'
    case 'billing':
      return 'json'
    case 'log':
      return 'plaintext'
    default:
      return 'plaintext'
  }
}

/**
 * 格式化日期字符串
 * @param {string} dateString - 原始日期字符串（ISO格式）
 * @returns {string} 格式化后的本地日期字符串
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 历史记录 Composable
 * @returns {Object} 历史记录相关方法
 */
export const useHistory = () => {
  const appStore = useAppStore()

  /**
   * 保存到历史记录
   * @param {Object} params - 参数
   * @param {HistoryType} params.type - 类型
   * @param {string} params.title - 标题
   * @param {string} params.content - 内容
   * @param {string} [params.result] - 结果（可选）
   * @param {boolean} [params.showMessage=true] - 是否显示成功消息
   */
  const saveToHistory = ({ type, title, content, result, showMessage = true }) => {
    if (!content && !result) {
      ElMessage.warning('没有内容可保存')
      return
    }

    appStore.addToHistory({
      type,
      title,
      content: content || '',
      result: result ? JSON.stringify(result, null, 2) : undefined
    })

    if (showMessage) {
      ElMessage.success('已保存到历史')
    }
  }

  /**
   * 保存 Jenkinsfile 到历史记录
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @param {boolean} [showMessage=true] - 是否显示成功消息
   */
  const saveJenkinsfile = (title, content, showMessage = true) => {
    saveToHistory({
      type: 'jenkinsfile',
      title: `Jenkinsfile - ${title}`,
      content,
      result: content,
      showMessage
    })
  }

  /**
   * 保存 Dockerfile 分析结果到历史记录
   * @param {Object} analysisResult - 分析结果对象
   * @param {number} analysisResult.score - 得分
   * @param {Array} analysisResult.issues - 问题列表
   * @param {Array} analysisResult.suggestions - 建议列表
   * @param {string} analysisResult.optimizedContent - 优化后的内容
   * @param {string} dockerfileContent - 原始 Dockerfile 内容
   * @param {boolean} [showMessage=true] - 是否显示成功消息
   */
  const saveDockerfileAnalysis = (analysisResult, dockerfileContent, showMessage = true) => {
    saveToHistory({
      type: 'dockerfile',
      title: `Dockerfile 分析 - 得分 ${analysisResult.score}`,
      content: dockerfileContent,
      result: analysisResult,
      showMessage
    })
  }

  /**
   * 保存账单分析结果到历史记录
   * @param {Object} result - 分析结果对象
   * @param {Object} result.summary - 摘要信息
   * @param {string} result.summary.period - 时间段
   * @param {string} csvContent - 原始 CSV 内容
   * @param {boolean} [showMessage=true] - 是否显示成功消息
   */
  const saveBillingAnalysis = (result, csvContent, showMessage = true) => {
    if (!result) return
    saveToHistory({
      type: 'billing',
      title: `账单分析 - ${result.summary.period}`,
      content: csvContent,
      result,
      showMessage
    })
  }

  /**
   * 保存日志翻译结果到历史记录
   * @param {Object} result - 翻译结果对象
   * @param {string} result.translation - 翻译内容
   * @param {string} result.explanation - 解释
   * @param {Array} result.fixes - 修复建议
   * @param {string} logContent - 原始日志内容
   * @param {boolean} [showMessage=true] - 是否显示成功消息
   */
  const saveLogTranslation = (result, logContent, showMessage = true) => {
    if (!result) return
    saveToHistory({
      type: 'log',
      title: '日志翻译',
      content: logContent,
      result,
      showMessage
    })
  }

  return {
    // 基础方法
    saveToHistory,
    
    // 类型专用方法
    saveJenkinsfile,
    saveDockerfileAnalysis,
    saveBillingAnalysis,
    saveLogTranslation,
    
    // 工具函数
    getTagType,
    getTypeLabel,
    getEditorLanguage,
    formatDate
  }
}

export default useHistory
