<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NCard,
  NButton,
  NSpace,
  NSpin,
  useMessage,
} from 'naive-ui'
import ExamForm from '@/components/exam/ExamForm.vue'
import SectionTable from '@/components/exam/SectionTable.vue'
import { useExamStore } from '@/stores/exam'
import { useDatabaseStore } from '@/stores/database'
import type { ExamFormData, ExamSectionFormData } from '@/types/exam'
import { todayStr } from '@/utils/formatters'
import { SECTION_HIERARCHY, SECTION_QUESTION_PRESETS, SECTION_SCORE_PRESETS } from '@/utils/constants'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const examStore = useExamStore()
const dbStore = useDatabaseStore()

const isEdit = ref(false)
const saving = ref(false)
const loading = ref(false)

let nextClientId = 1
function genId(): string { return `auto-${Date.now()}-${nextClientId++}` }

function createEmptySection(name: string, parentName: string | null, totalQuestions = 0, perQuestionScore = 1): ExamSectionFormData {
  return {
    client_id: genId(),
    section_id: 0,
    section_name: name,
    parent_section_name: parentName,
    total_questions: totalQuestions,
    correct_questions: 0,
    per_question_score: perQuestionScore,
    used_time: 0,
    unattempted_questions: 0,
    analysis: null,
    plan: null,
    next_target_accuracy: null,
    next_target_time: null,
    next_target_efficiency: null,
  }
}

function buildDefaultSections(type1: string): ExamSectionFormData[] {
  const sections: ExamSectionFormData[] = []
  const questionPresets = (SECTION_QUESTION_PRESETS as Record<string, Record<string, number>>)[type1]
  const scorePresets = (SECTION_SCORE_PRESETS as Record<string, Record<string, number>>)[type1]

  for (const parent of SECTION_HIERARCHY) {
    const parentTotal = questionPresets?.[parent.name] ?? 0
    const parentScore = scorePresets?.[parent.name] ?? 1
    sections.push(createEmptySection(parent.name, null, parentTotal, parentScore))

    if (parent.children) {
      for (const child of parent.children) {
        if (type1 === '国考') {
          if (child === '科学推理' || child === '数字推理') continue
        } else {
          if (child === '定义判断' || child === '类比推理') continue
        }
        const childTotal = questionPresets?.[child] ?? 0
        const childScore = scorePresets?.[child] ?? 1
        sections.push(createEmptySection(child, parent.name, childTotal, childScore))
      }
    }
  }
  return sections
}

const formData = ref<ExamFormData>(createEmptyForm())

function createEmptyForm(): ExamFormData {
  return {
    exam_id: 0,
    exam_name: '',
    exam_date: todayStr(),
    exam_type_1: '省考',
    exam_type: '模考',
    total_score: 0,
    full_score: 100,
    current_target_score: null,
    next_target_score: null,
    total_time: 90,
    notes: null,
    sections: buildDefaultSections('省考'),
  }
}

watch(
  () => formData.value.exam_type_1,
  (newVal, oldVal) => {
    if (isEdit.value || !oldVal) return
    if (newVal === '国考') {
      formData.value.total_time = 120
      formData.value.sections = buildDefaultSections('国考')
    } else if (newVal === '省考') {
      formData.value.total_time = 90
      formData.value.sections = buildDefaultSections('省考')
    }
  }
)

onMounted(async () => {
  const examId = route.query.edit ? Number(route.query.edit) : null
  if (examId && examId > 0) {
    isEdit.value = true
    loading.value = true
    try {
      await examStore.fetchExamById(examId)
      if (examStore.currentExam) {
        const e = examStore.currentExam
        const sections = examStore.currentSections
        formData.value = {
          exam_id: e.exam_id,
          exam_name: e.exam_name,
          exam_date: e.exam_date,
          exam_type_1: e.exam_type_1,
          exam_type: e.exam_type,
          total_score: e.total_score,
          full_score: e.full_score,
          current_target_score: e.current_target_score,
          next_target_score: e.next_target_score,
          total_time: e.total_time,
          notes: e.notes,
          sections: sections.map((s) => ({
            client_id: `edit-${s.section_id}`,
            section_id: s.section_id,
            section_name: s.section_name,
            parent_section_name: s.parent_section_name,
            total_questions: s.total_questions,
            correct_questions: s.correct_questions,
            per_question_score: s.per_question_score,
            used_time: s.used_time,
            unattempted_questions: s.unattempted_questions,
            analysis: s.analysis,
            plan: s.plan,
            next_target_accuracy: s.next_target_accuracy,
            next_target_time: s.next_target_time,
            next_target_efficiency: s.next_target_efficiency,
          })),
        }
      }
    } catch (e) {
      message.error('加载考试数据失败: ' + String(e))
    } finally {
      loading.value = false
    }
  }
})

async function handleSave() {
  if (!dbStore.isReady) {
    message.error('数据库未就绪，请重启应用')
    return
  }

  const fd = formData.value
  if (!fd.exam_name.trim()) {
    message.warning('请输入考试名称')
    return
  }
  if (!fd.exam_date) {
    message.warning('请选择考试日期')
    return
  }
  if (!fd.exam_type_1) {
    message.warning('请选择考试分类（国考/省考）')
    return
  }
  if (!fd.exam_type) {
    message.warning('请选择考试类型（模考/真题/...）')
    return
  }

  if (formData.value.sections.length === 0) {
    message.warning('请至少添加一个板块')
    return
  }
  const emptySection = formData.value.sections.find((s) => !s.section_name.trim())
  if (emptySection) {
    message.warning('请填写所有板块的名称')
    return
  }

  saving.value = true
  try {
    if (isEdit.value && formData.value.exam_id > 0) {
      await examStore.updateExam(formData.value)
      message.success('考试记录已更新')
    } else {
      await examStore.createExam(formData.value)
      message.success('考试记录已保存')
    }
    router.push('/exams')
  } catch (e) {
    message.error('保存失败: ' + String(e))
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  router.push('/exams')
}
</script>

<template>
  <div>
    <NSpin :show="loading">
      <div class="entry-header">
        <h2 class="entry-title">{{ isEdit ? '编辑考试' : '录入新考试' }}</h2>
        <NSpace :size="10">
          <NButton size="medium" @click="handleCancel">取消</NButton>
          <NButton type="primary" size="medium" :loading="saving" @click="handleSave">
            {{ isEdit ? '更新' : '保存' }}
          </NButton>
        </NSpace>
      </div>

      <!-- 考试基本信息表单 -->
      <NCard style="margin-bottom: 16px">
        <ExamForm v-model="formData" />
      </NCard>

      <!-- 板块成绩表 -->
      <NCard title="板块成绩">
        <SectionTable
          v-model:sections="formData.sections"
        />
      </NCard>

      <!-- 底部保存 -->
      <div style="margin-top: 24px; text-align: center">
        <NSpace :size="12">
          <NButton size="large" @click="handleCancel">取消</NButton>
          <NButton
            type="primary"
            size="large"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEdit ? '更新考试记录' : '保存考试记录' }}
          </NButton>
        </NSpace>
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.entry-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}
</style>
