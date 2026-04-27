let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

if (API_BASE_URL && !API_BASE_URL.endsWith('/api')) {
    if (API_BASE_URL.endsWith('/')) {
        API_BASE_URL += 'api'
    } else {
        API_BASE_URL += '/api'
    }
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

class ApiService {
  constructor(baseURL) {
    this.baseURL = baseURL
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken() {
    return this.token || localStorage.getItem('auth_token')
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config = {
      method,
      headers,
      credentials: 'include',
      ...options
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorData = null
        try {
          errorData = await response.json()
        } catch {
          errorData = { detail: response.statusText }
        }
        
        throw new ApiError(
          errorData.detail || `HTTP Error: ${response.status}`,
          response.status,
          errorData
        )
      }

      if (response.status === 204) {
        return null
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          this.setToken(null)
          window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
        throw error
      }
      
      throw new ApiError(
        error.message || 'Network error',
        0,
        null
      )
    }
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options)
  }

  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options)
  }

  put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options)
  }

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options)
  }

  patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options)
  }
}

export const api = new ApiService(API_BASE_URL)
export { ApiError }

export const authApi = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login/json', credentials),
  logout: () => {
    api.setToken(null)
    return Promise.resolve({ message: 'Logged out successfully' })
  },
  getMe: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh')
}

export const usersApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/users${query ? `?${query}` : ''}`)
  },
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

export const projectsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/projects${query ? `?${query}` : ''}`)
  },
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  archive: (id) => api.post(`/projects/${id}/archive`),
  unarchive: (id) => api.post(`/projects/${id}/unarchive`)
}

export const generationsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/generations${query ? `?${query}` : ''}`)
  },
  get: (id) => api.get(`/generations/${id}`),
  create: (data) => api.post('/generations', data),
  update: (id, data) => api.put(`/generations/${id}`, data),
  delete: (id) => api.delete(`/generations/${id}`),
  export: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/generations/history/export${query ? `?${query}` : ''}`)
  }
}

export const knowledgeApi = {
  getCategories: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/knowledge/categories${query ? `?${query}` : ''}`)
  },
  getCategory: (id) => api.get(`/knowledge/categories/${id}`),
  createCategory: (data) => api.post('/knowledge/categories', data),
  updateCategory: (id, data) => api.put(`/knowledge/categories/${id}`, data),
  
  getArticles: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/knowledge/articles${query ? `?${query}` : ''}`)
  },
  getArticle: (id) => api.get(`/knowledge/articles/${id}`),
  createArticle: (data) => api.post('/knowledge/articles', data),
  updateArticle: (id, data) => api.put(`/knowledge/articles/${id}`, data),
  deleteArticle: (id) => api.delete(`/knowledge/articles/${id}`)
}

export const workflowApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/workflow${query ? `?${query}` : ''}`)
  },
  get: (id) => api.get(`/workflow/${id}`),
  create: (data) => api.post('/workflow', data),
  update: (id, data) => api.put(`/workflow/${id}`, data),
  delete: (id) => api.delete(`/workflow/${id}`),
  execute: (id, data = {}) => api.post(`/workflow/${id}/execute`, data),
  
  getExecutions: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/workflow/executions${query ? `?${query}` : ''}`)
  },
  getExecution: (id) => api.get(`/workflow/executions/${id}`),
  getExecutionSteps: (id) => api.get(`/workflow/executions/${id}/steps`)
}
