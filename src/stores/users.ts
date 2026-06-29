import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/utils/api'
import type { AppUser } from './auth'

export const useUsersStore = defineStore('users', () => {
  const users = ref<AppUser[]>([])
  const loading = ref(false)

  async function fetchUsers() {
    loading.value = true
    try {
      const result = await api.get<{ users: AppUser[] }>('/auth/users')
      users.value = result.users
    } finally {
      loading.value = false
    }
  }

  async function createUser(username: string, password: string) {
    await api.post('/auth/users', { username, password })
    await fetchUsers()
  }

  async function updateUser(id: number, data: { password?: string; disabled?: boolean }) {
    await api.patch(`/auth/users/${id}`, data)
    await fetchUsers()
  }

  return { users, loading, fetchUsers, createUser, updateUser }
})
