import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/utils/api'
import type {
  ExamRecord,
  ExamSectionRecord,
  ExamFormData,
  ExamFilters,
  ReviewQuestionRecord,
} from '@/types/exam'

export const useExamStore = defineStore('exam', () => {
  const exams = ref<ExamRecord[]>([])
  const currentExam = ref<ExamRecord | null>(null)
  const currentSections = ref<ExamSectionRecord[]>([])
  const currentWrongQuestions = ref<ReviewQuestionRecord[]>([])
  const currentSpeedQuestions = ref<ReviewQuestionRecord[]>([])
  const currentFastCorrectQuestions = ref<ReviewQuestionRecord[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const filters = ref<ExamFilters>({})

  const filteredExams = computed(() => {
    let list = exams.value
    if (filters.value.keyword) {
      const kw = filters.value.keyword.toLowerCase()
      list = list.filter((e) => e.exam_name.toLowerCase().includes(kw))
    }
    if (filters.value.exam_type_1) list = list.filter((e) => e.exam_type_1 === filters.value.exam_type_1)
    if (filters.value.exam_type) list = list.filter((e) => e.exam_type === filters.value.exam_type)
    return list
  })

  async function fetchExams() {
    loading.value = true
    try {
      exams.value = (await api.get<{ exams: ExamRecord[] }>('/exams')).exams
    } finally {
      loading.value = false
    }
  }

  async function fetchExamById(examId: number) {
    loading.value = true
    try {
      const data = await api.get<{
        exam: ExamRecord
        sections: ExamSectionRecord[]
        wrong_questions: ReviewQuestionRecord[]
        speed_questions: ReviewQuestionRecord[]
        fast_correct_questions: ReviewQuestionRecord[]
      }>(`/exams/${examId}`)
      currentExam.value = data.exam
      currentSections.value = data.sections
      currentWrongQuestions.value = data.wrong_questions
      currentSpeedQuestions.value = data.speed_questions
      currentFastCorrectQuestions.value = data.fast_correct_questions
    } finally {
      loading.value = false
    }
  }

  async function createExam(data: ExamFormData) {
    if (saving.value) throw new Error('Save is already in progress')
    saving.value = true
    try {
      const result = await api.post<{ exam_id: number }>('/exams', data)
      await fetchExams()
      return result.exam_id
    } finally {
      saving.value = false
    }
  }

  async function updateExam(data: ExamFormData) {
    if (saving.value) throw new Error('Save is already in progress')
    saving.value = true
    try {
      await api.put(`/exams/${data.exam_id}`, data)
      await fetchExams()
      if (currentExam.value?.exam_id === data.exam_id) await fetchExamById(data.exam_id)
    } finally {
      saving.value = false
    }
  }

  async function deleteExam(examId: number) {
    await api.delete(`/exams/${examId}`)
    await fetchExams()
  }

  async function fetchSections(examId: number) {
    await fetchExamById(examId)
  }

  async function fetchPreviousSameTypeSections(examId: number): Promise<ExamSectionRecord[]> {
    return (await api.get<{ sections: ExamSectionRecord[] }>(`/exams/${examId}/previous-sections`)).sections
  }

  async function updateSection(section: ExamSectionRecord) {
    const result = await api.patch<{ section: ExamSectionRecord }>(`/sections/${section.section_id}`, section)
    const idx = currentSections.value.findIndex((s) => s.section_id === section.section_id)
    if (idx >= 0) currentSections.value[idx] = result.section
  }

  function setFilters(f: ExamFilters) {
    filters.value = { ...f }
  }

  function clearFilters() {
    filters.value = {}
  }

  return {
    exams,
    currentExam,
    currentSections,
    currentWrongQuestions,
    currentSpeedQuestions,
    currentFastCorrectQuestions,
    loading,
    filters,
    filteredExams,
    fetchExams,
    fetchExamById,
    createExam,
    updateExam,
    deleteExam,
    fetchSections,
    fetchPreviousSameTypeSections,
    updateSection,
    setFilters,
    clearFilters,
  }
})
