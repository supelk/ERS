import { api, apiUrl, getAuthToken } from '@/utils/api'
import type { ExamRecord, ExamSectionRecord } from '@/types/exam'

export interface ExportData {
  version: string
  exported_at: string
  exams: ExamExportItem[]
}

export interface ExamExportItem {
  exam: ExamRecord
  sections: ExamSectionRecord[]
}

export async function exportToJSON(examIds?: number[]): Promise<ExportData> {
  const qs = examIds?.length ? `?ids=${examIds.join(',')}` : ''
  return api.get<ExportData>(`/export/exams${qs}`)
}

export async function importFromJSON(data: ExportData): Promise<{ imported: number; skipped: number }> {
  return api.post<{ imported: number; skipped: number }>('/import/exams', data)
}

export async function exportToCSV(examIds?: number[]): Promise<string> {
  const search = new URLSearchParams({ format: 'csv' })
  if (examIds?.length) search.set('ids', examIds.join(','))
  const response = await fetch(apiUrl(`/export/exams?${search}`), {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  })
  if (!response.ok) throw new Error(await response.text())
  return response.text()
}

export async function importFromCSV(_csvContent: string): Promise<{ imported: number; skipped: number }> {
  throw new Error('CSV import is not available in cloud mode yet. Please import JSON exports.')
}
