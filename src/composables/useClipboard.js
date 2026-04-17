import { ElMessage } from 'element-plus'

/**
 * 剪贴板和文件下载相关的 Composable
 * @returns {Object} 相关方法
 */
export const useClipboard = () => {
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
      await navigator.clipboard.writeText(text)
      ElMessage.success(successMessage)
    } catch (error) {
      console.error('复制到剪贴板失败:', error)
      ElMessage.error('复制失败')
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
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      ElMessage.success(successMessage)
    } catch (error) {
      console.error('下载文件失败:', error)
      ElMessage.error('下载失败')
    }
  }

  return {
    copyToClipboard,
    downloadFile
  }
}

export default useClipboard
