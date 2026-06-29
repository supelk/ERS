import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/utils/api'
import type {
  SectionComparison,
  TimeDistribution,
  TrendPoint,
  MultiExamSectionTrend,
} from '@/types/exam'

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const useAnalysisStore = defineStore('analysis', () => {
  const loading = ref(false)

  async function getSectionComparisons(examId: number): Promise<SectionComparison[]> {
    return (await api.get<{ items: SectionComparison[] }>(`/analysis/exams/${examId}/section-comparisons`)).items
  }

  async function getTimeDistribution(examId: number): Promise<TimeDistribution[]> {
    return (await api.get<{ items: TimeDistribution[] }>(`/analysis/exams/${examId}/time-distribution`)).items
  }

  async function getEfficiencyData(examId: number): Promise<{ section_name: string; value: number }[]> {
    return (await api.get<{ items: { section_name: string; value: number }[] }>(`/analysis/exams/${examId}/efficiency`)).items
  }

  async function getScoreTrend(filterType1?: string, filterType?: string, dateFrom?: string, dateTo?: string): Promise<TrendPoint[]> {
    return (await api.get<{ items: TrendPoint[] }>(`/analysis/score-trend${qs({ filterType1, filterType, dateFrom, dateTo })}`)).items
  }

  async function getAllSectionTrends(filterType1?: string, filterType?: string, dateFrom?: string, dateTo?: string): Promise<MultiExamSectionTrend[]> {
    return (await api.get<{ items: MultiExamSectionTrend[] }>(`/analysis/section-trends/accuracy${qs({ filterType1, filterType, dateFrom, dateTo })}`)).items
  }

  async function getSectionTimeTrends(filterType1?: string, filterType?: string, dateFrom?: string, dateTo?: string): Promise<MultiExamSectionTrend[]> {
    return (await api.get<{ items: MultiExamSectionTrend[] }>(`/analysis/section-trends/time${qs({ filterType1, filterType, dateFrom, dateTo })}`)).items
  }

  async function getSectionEfficiencyTrends(filterType1?: string, filterType?: string, dateFrom?: string, dateTo?: string): Promise<MultiExamSectionTrend[]> {
    return (await api.get<{ items: MultiExamSectionTrend[] }>(`/analysis/section-trends/efficiency${qs({ filterType1, filterType, dateFrom, dateTo })}`)).items
  }

  async function getAvailableSections(filterType1?: string, filterType?: string, dateFrom?: string, dateTo?: string): Promise<string[]> {
    return (await api.get<{ sections: string[] }>(`/analysis/sections${qs({ filterType1, filterType, dateFrom, dateTo })}`)).sections
  }

  async function getExamSummary(examId: number) {
    return (await api.get<{ summary: any }>(`/analysis/exams/${examId}/summary`)).summary
  }

  return {
    loading,
    getSectionComparisons,
    getTimeDistribution,
    getEfficiencyData,
    getScoreTrend,
    getSectionTimeTrends,
    getSectionEfficiencyTrends,
    getAllSectionTrends,
    getAvailableSections,
    getExamSummary,
  }
})
