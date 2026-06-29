import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDatabaseStore = defineStore('database', () => {
  const db = ref<null>(null)
  const isReady = ref(false)
  const error = ref<string | null>(null)
  const initError = ref<string | null>(null)

  async function init() {
    if (isReady.value) return
    isReady.value = true
  }

  function getDb(): never {
    throw new Error('Local database is disabled in cloud mode. Use API stores instead.')
  }

  async function close() {
    db.value = null
    isReady.value = false
  }

  return { db, isReady, error, initError, init, getDb, close }
})
