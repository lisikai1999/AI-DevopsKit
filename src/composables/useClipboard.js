import { ElMessage } from 'element-plus'
import { analyzeError, ErrorType } from '@/utils/errorHandler'

/**
 * 剪贴板和文件下载相关的 Composable
 * @returns {Object} 相关方法
 */
export const useClipboard = () => {
  /**
   * 格式化错误消息供用户显示
   * @param {Error} error - 错误对象
   * @param {string} action - 操作名称
   * @returns {string} 用户友好的错误消息
   */
  const formatUserError = (error, action) => {
    const { userMessage, details } = analyzeError(error)
    
    console.error(`[useClipboard] ${action}失败`, {
      error: error.message,
      type: error.name,
      details
    })
    
    return `${action}失败: ${userMessage || error.message || '未知错误'}`
  }

  /**
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本内容
   * @param {string} [successMessage='已复制到剪贴板'] - 成功提示消息
   */
  const copyToClipboard = async (text, successMessage = '已复制到剪贴板') => {
    if (!text) {
      ElMessage.warning('没有内容可复制')
      return
    }
    
    try {
      if (!navigator.clipboard) {
        throw new Error('浏览器不支持 Clipboard API')
      }
      
      await navigator.clipboard.writeText(text)
      ElMessage.success(successMessage)
    } catch (error) {
      const errorMsg = formatUserError(error, '复制')
      
      if (error.name === 'NotAllowedError') {
        ElMessage.error(`${errorMsg} - 请检查浏览器的剪贴板权限设置`)
      } else if (error.message?.includes('不支持')) {
        ElMessage.error(`${errorMsg} - 您的浏览器不支持此功能`)
      } else {
        ElMessage.error(errorMsg)
      }
    }
  }

  /**
   * 下载文件
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @param {string} [type='text/plain'] - 文件类型
   * @param {string} [successMessage='文件下载成功'] - 成功提示消息
   */
  const downloadFile = (content, filename, type = 'text/plain', successMessage = '文件下载成功') => {
    if (!content) {
      ElMessage.warning('没有内容可下载')
      return
    }
    
    try {
      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'download.txt'
      a.style.display = 'none'
      
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      
      ElMessage.success(successMessage)
    } catch (error) {
      const errorMsg = formatUserError(error, '下载')
      ElMessage.error(errorMsg)
    }
  }

  return {
    copyToClipboard,
    downloadFile
  }
}

export default useClipboard
