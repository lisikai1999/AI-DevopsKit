/**
 * 错误类型枚举
 * @readonly
 * @enum {string}
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  API: 'API',
  AUTH: 'AUTH',
  TIMEOUT: 'TIMEOUT',
  PARSING: 'PARSING',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN',
  CLIPBOARD: 'CLIPBOARD',
  FILE: 'FILE'
}

/**
 * 错误消息映射
 * @type {Object.<string, string>}
 */
const errorMessages = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试',
  [ErrorType.API]: 'API 调用失败',
  [ErrorType.AUTH]: '身份验证失败，请检查 API 密钥',
  [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorType.PARSING]: '数据解析失败',
  [ErrorType.VALIDATION]: '数据验证失败',
  [ErrorType.UNKNOWN]: '发生未知错误',
  [ErrorType.CLIPBOARD]: '剪贴板操作失败',
  [ErrorType.FILE]: '文件操作失败'
}

/**
 * 自定义错误类，包含更多上下文信息
 */
export class AppError extends Error {
  /**
   * @param {string} message - 错误消息
   * @param {ErrorType} type - 错误类型
   * @param {Object} [options={}] - 额外选项
   * @param {Error} [options.cause] - 原始错误
   * @param {string} [options.userMessage] - 显示给用户的消息
   * @param {Object} [options.details] - 详细信息
   * @param {number} [options.statusCode] - HTTP 状态码
   */
  constructor(message, type = ErrorType.UNKNOWN, options = {}) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.cause = options.cause
    this.userMessage = options.userMessage || this._getDefaultUserMessage(type, message)
    this.details = options.details || {}
    this.statusCode = options.statusCode
    this.timestamp = new Date().toISOString()
  }

  /**
   * 获取默认的用户消息
   * @param {ErrorType} type - 错误类型
   * @param {string} defaultMsg - 默认消息
   * @returns {string}
   */
  _getDefaultUserMessage(type, defaultMsg) {
    return errorMessages[type] || defaultMsg
  }

  /**
   * 将错误转换为可序列化的对象
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      userMessage: this.userMessage,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    }
  }

  /**
   * 从普通错误创建 AppError
   * @param {Error} error - 原始错误
   * @param {ErrorType} [defaultType=ErrorType.UNKNOWN] - 默认错误类型
   * @returns {AppError}
   */
  static fromError(error, defaultType = ErrorType.UNKNOWN) {
    if (error instanceof AppError) {
      return error
    }

    const { type, userMessage, details } = analyzeError(error)
    
    return new AppError(error.message, type, {
      cause: error,
      userMessage,
      details
    })
  }
}

/**
 * 分析错误，确定错误类型和详细信息
 * @param {Error|any} error - 错误对象
 * @returns {{ type: ErrorType, userMessage: string, details: Object }}
 */
export function analyzeError(error) {
  const result = {
    type: ErrorType.UNKNOWN,
    userMessage: '发生未知错误',
    details: {}
  }

  if (!error) {
    return result
  }

  // 检查是否是 Axios 错误
  if (error.isAxiosError) {
    result.details = {
      url: error.config?.url,
      method: error.config?.method,
      statusCode: error.response?.status
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      result.type = ErrorType.TIMEOUT
      result.userMessage = '请求超时，请检查网络后重试'
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      result.type = ErrorType.NETWORK
      result.userMessage = '无法连接到服务器，请检查网络连接'
    } else if (error.response) {
      const status = error.response.status
      result.details.statusText = error.response.statusText
      result.details.responseData = error.response.data

      if (status === 401) {
        result.type = ErrorType.AUTH
        result.userMessage = '身份验证失败，请检查 API 密钥配置'
      } else if (status === 403) {
        result.type = ErrorType.AUTH
        result.userMessage = '没有权限执行此操作'
      } else if (status === 404) {
        result.type = ErrorType.API
        result.userMessage = '请求的资源不存在'
      } else if (status >= 500) {
        result.type = ErrorType.API
        result.userMessage = `服务器错误 (${status})，请稍后重试`
      } else {
        result.type = ErrorType.API
        result.userMessage = `API 调用失败 (${status})`
      }
    } else if (error.request) {
      result.type = ErrorType.NETWORK
      result.userMessage = '无法连接到服务器，请检查网络连接'
    }
    return result
  }

  // 检查 JSON 解析错误
  if (error instanceof SyntaxError && error.message?.includes('JSON')) {
    result.type = ErrorType.PARSING
    result.userMessage = '数据格式错误，无法解析'
    result.details = { parsingError: error.message }
    return result
  }

  // 检查剪贴板错误
  if (error.message?.includes('clipboard') || error.name === 'NotAllowedError') {
    result.type = ErrorType.CLIPBOARD
    result.userMessage = '无法访问剪贴板，请检查浏览器权限设置'
    return result
  }

  // 检查文件操作错误
  if (error.name === 'FileReader' || error.message?.includes('File') || error.message?.includes('download')) {
    result.type = ErrorType.FILE
    result.userMessage = '文件操作失败'
    return result
  }

  // 检查类型错误
  if (error instanceof TypeError) {
    result.type = ErrorType.VALIDATION
    result.userMessage = '数据类型错误'
    result.details = { typeError: error.message }
    return result
  }

  // 默认情况，使用错误消息
  if (error.message) {
    result.userMessage = error.message
  }

  return result
}

/**
 * 安全地包装异步函数，统一处理错误
 * @template T
 * @param {() => Promise<T>} fn - 要执行的函数
 * @param {Object} [options={}] - 选项
 * @param {string} [options.fallbackMessage] - 备用错误消息
 * @param {ErrorType} [options.defaultType] - 默认错误类型
 * @returns {Promise<{ success: true, data: T } | { success: false, error: AppError }>}
 */
export async function safeAsync(fn, options = {}) {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const appError = AppError.fromError(error, options.defaultType || ErrorType.UNKNOWN)
    
    if (options.fallbackMessage && !appError.userMessage) {
      appError.userMessage = options.fallbackMessage
    }
    
    console.error(`[${appError.type}] ${appError.userMessage}`, appError)
    
    return { success: false, error: appError }
  }
}

/**
 * 创建一个错误处理包装器
 * @param {Object} options - 选项
 * @param {(error: AppError) => void} [options.onError] - 错误回调
 * @param {boolean} [options.logErrors=true] - 是否记录错误
 * @returns {(fn: () => Promise<any>, config?: Object) => Promise<any>}
 */
export function createErrorHandler(options = {}) {
  const { onError, logErrors = true } = options

  return async (fn, config = {}) => {
    try {
      return await fn()
    } catch (error) {
      const appError = AppError.fromError(error, config.defaultType)
      
      if (logErrors) {
        console.error(`[Error Handler] ${appError.type}:`, appError.toJSON())
      }
      
      if (onError) {
        onError(appError)
      }
      
      throw appError
    }
  }
}

/**
 * 格式化错误消息供用户显示
 * @param {Error|AppError|string} error - 错误
 * @param {string} [fallback='操作失败'] - 备用消息
 * @returns {string}
 */
export function formatUserMessage(error, fallback = '操作失败') {
  if (typeof error === 'string') {
    return error
  }
  
  if (error instanceof AppError) {
    return error.userMessage || error.message
  }
  
  if (error?.message) {
    const { userMessage } = analyzeError(error)
    return userMessage || error.message
  }
  
  return fallback
}

/**
 * 提取技术细节用于调试
 * @param {Error|AppError} error - 错误
 * @returns {Object}
 */
export function getErrorDetails(error) {
  if (error instanceof AppError) {
    return {
      ...error.details,
      type: error.type,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      cause: error.cause?.message
    }
  }
  
  const { type, details } = analyzeError(error)
  
  return {
    type,
    message: error?.message,
    stack: error?.stack,
    ...details
  }
}

export default {
  ErrorType,
  AppError,
  analyzeError,
  safeAsync,
  createErrorHandler,
  formatUserMessage,
  getErrorDetails
}
