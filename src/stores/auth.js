import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi, api } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token'))
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isUser = computed(() => user.value?.role === 'USER' || user.value?.role === 'ADMIN')
  const isReadOnly = computed(() => user.value?.role === 'READONLY')

  async function initialize() {
    if (isInitialized.value) return
    
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      token.value = savedToken
      api.setToken(savedToken)
      try {
        await fetchUser()
      } catch (error) {
        console.error('Failed to fetch user on initialization:', error)
        logout()
      }
    }
    isInitialized.value = true
  }

  async function fetchUser() {
    try {
      const userData = await authApi.getMe()
      user.value = userData
      return userData
    } catch (error) {
      throw error
    }
  }

  async function login(credentials) {
    isLoading.value = true
    try {
      const result = await authApi.login(credentials)
      token.value = result.access_token
      user.value = result.user
      api.setToken(result.access_token)
      localStorage.setItem('auth_token', result.access_token)
      localStorage.setItem('auth_user', JSON.stringify(result.user))
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function register(userData) {
    isLoading.value = true
    try {
      const result = await authApi.register(userData)
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      token.value = null
      user.value = null
      api.setToken(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  async function refreshToken() {
    try {
      const result = await authApi.refreshToken()
      token.value = result.access_token
      user.value = result.user
      api.setToken(result.access_token)
      localStorage.setItem('auth_token', result.access_token)
      return result
    } catch (error) {
      logout()
      throw error
    }
  }

  function can(permission) {
    if (!user.value) return false
    
    const roleHierarchy = {
      'READONLY': 0,
      'USER': 1,
      'ADMIN': 2
    }
    
    const userLevel = roleHierarchy[user.value.role] ?? 0
    
    switch (permission) {
      case 'read':
        return userLevel >= 0
      case 'write':
        return userLevel >= 1
      case 'admin':
        return userLevel >= 2
      default:
        return false
    }
  }

  return {
    user,
    token,
    isLoading,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isUser,
    isReadOnly,
    initialize,
    login,
    register,
    logout,
    refreshToken,
    fetchUser,
    can
  }
})
