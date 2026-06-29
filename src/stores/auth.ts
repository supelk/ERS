import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, clearAuthToken, getAuthToken, setAuthToken } from '@/utils/api'

export interface AppUser {
  id: number
  username: string
  role: 'admin' | 'user'
  disabled: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getAuthToken())
  const user = ref<AppUser | null>(null)
  const loading = ref(false)
  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function init() {
    if (!token.value) return
    loading.value = true
    try {
      const result = await api.get<{ user: AppUser }>('/auth/me')
      user.value = result.user
    } catch {
      logout()
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    try {
      const result = await api.post<{ token: string; user: AppUser }>('/auth/login', { username, password })
      token.value = result.token
      user.value = result.user
      setAuthToken(result.token)
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    clearAuthToken()
  }

  return { token, user, loading, isAuthenticated, isAdmin, init, login, logout }
})
