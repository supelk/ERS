import { defineStore } from 'pinia'
import { ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'
import { initDatabase } from '@/db/init'

export const useDatabaseStore = defineStore('database', () => {
  const db = ref<Database | null>(null)
  const isReady = ref(false)
  const error = ref<string | null>(null)
  const initError = ref<string | null>(null)

  async function init() {
    if (isReady.value) return
    try {
      const instance = await Database.load('sqlite:ers.db')
      await initDatabase(instance)
      db.value = instance
      isReady.value = true
      console.log('[DB] Database ready')
    } catch (e) {
      const errMsg = String(e)
      error.value = errMsg
      initError.value = errMsg
      console.error('[DB] Init failed:', errMsg)
      throw e
    }
  }

  function getDb(): Database {
    if (!db.value) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return db.value
  }

  async function close() {
    if (db.value) {
      await db.value.close()
      db.value = null
      isReady.value = false
    }
  }

  return { db, isReady, error, initError, init, getDb, close }
})
