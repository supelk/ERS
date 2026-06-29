import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/utils/api'
import type { PracticeRecord, PracticeFormData } from '@/types/exam'

export const usePracticeStore = defineStore('practice', () => {
  const records = ref<PracticeRecord[]>([])
  const currentRecord = ref<PracticeRecord | null>(null)
  const loading = ref(false)

  async function fetchRecords(): Promise<void> {
    loading.value = true
    try {
      records.value = (await api.get<{ records: PracticeRecord[] }>('/practice-records')).records
    } finally {
      loading.value = false
    }
  }

  async function fetchRecordById(id: number): Promise<void> {
    loading.value = true
    try {
      currentRecord.value = (await api.get<{ record: PracticeRecord }>(`/practice-records/${id}`)).record
    } finally {
      loading.value = false
    }
  }

  async function createRecord(data: PracticeFormData): Promise<number> {
    const record = (await api.post<{ record: PracticeRecord }>('/practice-records', data)).record
    await fetchRecords()
    return record.id
  }

  async function updateRecord(data: PracticeFormData): Promise<void> {
    await api.put(`/practice-records/${data.id}`, data)
    await fetchRecords()
    if (currentRecord.value?.id === data.id) await fetchRecordById(data.id)
  }

  async function deleteRecord(id: number): Promise<void> {
    await api.delete(`/practice-records/${id}`)
    if (currentRecord.value?.id === id) currentRecord.value = null
    await fetchRecords()
  }

  async function getTrends(sectionName?: string) {
    const qs = sectionName ? `?section_name=${encodeURIComponent(sectionName)}` : ''
    return api.get<{
      xLabels: string[]
      accuracyData: number[]
      avgTimeData: number[]
      totalQuestionsData: number[]
    }>(`/practice-records/trends${qs}`)
  }

  async function getAvailableSections(): Promise<string[]> {
    return (await api.get<{ sections: string[] }>('/practice-records/sections')).sections
  }

  return {
    records,
    currentRecord,
    loading,
    fetchRecords,
    fetchRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    getTrends,
    getAvailableSections,
  }
})
