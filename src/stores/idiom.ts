import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/utils/api'
import type { IdiomRecord } from '@/types/exam'

export const useIdiomStore = defineStore('idiom', () => {
  const records = ref<IdiomRecord[]>([])
  const currentRecord = ref<IdiomRecord | null>(null)
  const loading = ref(false)
  const filteredRecords = computed(() => records.value)

  async function fetchRecords(keyword?: string): Promise<void> {
    loading.value = true
    try {
      const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
      records.value = (await api.get<{ records: IdiomRecord[] }>(`/idioms${qs}`)).records
    } finally {
      loading.value = false
    }
  }

  async function fetchRecordById(id: number): Promise<void> {
    loading.value = true
    try {
      currentRecord.value = (await api.get<{ record: IdiomRecord }>(`/idioms/${id}`)).record
    } finally {
      loading.value = false
    }
  }

  async function createRecord(word: string, definition: string, notes: string | null): Promise<number> {
    const record = (await api.post<{ record: IdiomRecord }>('/idioms', { word, definition, notes })).record
    return record.id
  }

  async function updateRecord(id: number, data: { word?: string; definition?: string; notes?: string | null }): Promise<void> {
    await api.patch(`/idioms/${id}`, data)
  }

  async function deleteRecord(id: number): Promise<void> {
    await api.delete(`/idioms/${id}`)
    if (currentRecord.value?.id === id) currentRecord.value = null
  }

  async function getRandomRecords(count: number): Promise<IdiomRecord[]> {
    return (await api.get<{ records: IdiomRecord[] }>(`/idioms?random=1&count=${count}`)).records
  }

  return { records, currentRecord, filteredRecords, loading, fetchRecords, fetchRecordById, createRecord, updateRecord, deleteRecord, getRandomRecords }
})
