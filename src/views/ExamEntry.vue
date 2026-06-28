<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NCard,
  NButton,
  NSpace,
  NSpin,
  useMessage,
} from 'naive-ui'
import ExamForm from '@/components/exam/ExamForm.vue'
import ExamOrderInput from '@/components/exam/ExamOrderInput.vue'
import SectionTable from '@/components/exam/SectionTable.vue'
import ReviewTabs from '@/components/exam/ReviewTabs.vue'
import { useExamStore } from '@/stores/exam'
import { useDatabaseStore } from '@/stores/database'
import type { ExamFormData, ExamSectionFormData } from '@/types/exam'
import type { RecognizedSectionDraft } from '@/utils/sectionOcr'
import { todayStr } from '@/utils/formatters'
import { SECTION_HIERARCHY, SECTION_QUESTION_PRESETS, SECTION_SCORE_PRESETS } from '@/utils/constants'
import { getMemory, saveMemory, type ExamMemory } from '@/utils/examMemory'
import { normalizeRecognizedScore } from '@/utils/sectionOcr'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const examStore = useExamStore()
const dbStore = useDatabaseStore()

const isEdit = ref(false)
const saving = ref(false)
const loading = ref(false)
const sectionCardRef = ref<HTMLElement | null>(null)
const highlightedSections = ref(false)

/** 当前一级板块名称列表（供错题表分组联动） */
const parentSectionNames = computed(() =>
  formData.value.sections
    .filter((s) => !s.parent_section_name)
    .map((s) => s.section_name)
)

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

// ============================================================
// 历史记忆：追踪用户已手动编辑的字段
// ============================================================
const touchedExamFields = ref<Set<string>>(new Set())

function markTouched(field: string) {
  touchedExamFields.value.add(field)
}

/** 将记忆数据中的目标字段覆盖到表单（不覆盖用户已手动编辑的字段） */
function applyMemoryToForm(memory: ExamMemory) {
  // 考试级字段 — 仅在未手动编辑时回填
  if (!touchedExamFields.value.has('current_target_score') && memory.current_target_score != null) {
    formData.value.current_target_score = memory.current_target_score
  }
  if (!touchedExamFields.value.has('next_target_score') && memory.next_target_score != null) {
    formData.value.next_target_score = memory.next_target_score
  }
  if (!touchedExamFields.value.has('total_time') && memory.total_time != null) {
    formData.value.total_time = memory.total_time
  }

  // 板块级字段 — sections 在分类切换时重建，无需 touched 检查
  for (const section of formData.value.sections) {
    const memSec = memory.sections[section.section_name]
    if (memSec) {
      if (memSec.next_target_accuracy != null) {
        section.next_target_accuracy = memSec.next_target_accuracy
      }
      if (memSec.next_target_time != null) {
        section.next_target_time = memSec.next_target_time
      }
    }
  }
}

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
    question_order: null,
    notes: null,
    sections: buildDefaultSections('省考'),
    wrong_questions: [],
    speed_questions: [],
    fast_correct_questions: [],
  }
}

watch(
  () => formData.value.exam_type_1,
  async (newVal, oldVal) => {
    if (isEdit.value || !oldVal) return

    // 1. 重建默认板块（沿用系统固定预设值）
    const newSections = buildDefaultSections(newVal)
    const defaultTotalTime = newVal === '国考' ? 120 : 90

    // 2. 应用考试级默认值（不覆盖用户已手动编辑的字段）
    if (!touchedExamFields.value.has('total_time')) {
      formData.value.total_time = defaultTotalTime
    }
    // current_target_score / next_target_score 不在系统预设中，切换分类时不动

    // 3. 加载历史记忆，覆盖默认值（不覆盖用户已手动编辑的字段）
    const memory = await getMemory(newVal)
    if (memory) {
      // 考试级字段
      if (!touchedExamFields.value.has('current_target_score') && memory.current_target_score != null) {
        formData.value.current_target_score = memory.current_target_score
      }
      if (!touchedExamFields.value.has('next_target_score') && memory.next_target_score != null) {
        formData.value.next_target_score = memory.next_target_score
      }
      if (!touchedExamFields.value.has('total_time') && memory.total_time != null) {
        formData.value.total_time = memory.total_time
      }

      // 板块级目标字段 — 按板块名称匹配
      for (const section of newSections) {
        const memSec = memory.sections[section.section_name]
        if (memSec) {
          if (memSec.next_target_accuracy != null) {
            section.next_target_accuracy = memSec.next_target_accuracy
          }
          if (memSec.next_target_time != null) {
            section.next_target_time = memSec.next_target_time
          }
        }
      }
    }

    // 4. 更新为新的板块列表，重置所有复盘题目
    formData.value.sections = newSections
    formData.value.wrong_questions = []
    formData.value.speed_questions = []
    formData.value.fast_correct_questions = []

    // 5. 重置 touched 追踪（新分类下用户尚未编辑任何考试级字段）
    touchedExamFields.value.clear()
  }
)

// 板块重命名/删除时，同步错题数据
watch(
  () => formData.value.sections,
  (newSections, oldSections) => {
    if (!oldSections || oldSections.length === 0) return

    // 检测一级板块重命名（通过 client_id 匹配）
    const renameMap = new Map<string, string>()
    for (const old of oldSections) {
      if (old.parent_section_name) continue // 只关心一级板块
      const matched = newSections.find((s) => s.client_id === old.client_id)
      if (matched && matched.section_name !== old.section_name) {
        renameMap.set(old.section_name, matched.section_name)
      }
    }

    // 检测一级板块删除
    const newParentNames = new Set(
      newSections.filter((s) => !s.parent_section_name).map((s) => s.section_name)
    )

    if (renameMap.size > 0 || newParentNames.size < newSections.filter((s) => !s.parent_section_name).length) {
      // 同步三个 Tab 的复盘题目数据
      const sync = (list: typeof formData.value.wrong_questions) =>
        list
          .map((q) => renameMap.has(q.section_name) ? { ...q, section_name: renameMap.get(q.section_name)! } : q)
          .filter((q) => newParentNames.has(q.section_name))
      formData.value.wrong_questions = sync(formData.value.wrong_questions)
      formData.value.speed_questions = sync(formData.value.speed_questions)
      formData.value.fast_correct_questions = sync(formData.value.fast_correct_questions)
    }
  },
  { deep: true }
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
          question_order: e.question_order,
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
          wrong_questions: examStore.currentWrongQuestions.map((q) => ({
            client_id: `edit-wq-${q.id}`, id: q.id,
            section_name: q.section_name, question_number: q.question_number,
            time_spent: q.time_spent, knowledge_point: q.knowledge_point,
            analysis: q.analysis, improvement_plan: q.improvement_plan,
            solving_insight: '',
          })),
          speed_questions: examStore.currentSpeedQuestions.map((q) => ({
            client_id: `edit-sq-${q.id}`, id: q.id,
            section_name: q.section_name, question_number: q.question_number,
            time_spent: q.time_spent, knowledge_point: q.knowledge_point,
            analysis: q.analysis, improvement_plan: q.improvement_plan,
            solving_insight: '',
          })),
          fast_correct_questions: examStore.currentFastCorrectQuestions.map((q) => ({
            client_id: `edit-fq-${q.id}`, id: q.id,
            section_name: q.section_name, question_number: q.question_number,
            time_spent: q.time_spent, knowledge_point: q.knowledge_point,
            analysis: '', improvement_plan: '',
            solving_insight: q.solving_insight,
          })),
        }
      }
    } catch (e) {
      message.error('加载考试数据失败: ' + String(e))
    } finally {
      loading.value = false
    }
  } else {
    // 新建考试：尝试加载该分类的历史记忆
    const memory = await getMemory(formData.value.exam_type_1)
    if (memory) {
      applyMemoryToForm(memory)
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

    // 提交成功后，更新该分类的历史记忆（供下次新建时回填）
    const fd = formData.value
    const sectionMemory: ExamMemory['sections'] = {}
    for (const s of fd.sections) {
      if (s.next_target_accuracy != null || s.next_target_time != null) {
        sectionMemory[s.section_name] = {
          next_target_accuracy: s.next_target_accuracy ?? null,
          next_target_time: s.next_target_time ?? null,
        }
      }
    }
    saveMemory(fd.exam_type_1, {
      current_target_score: fd.current_target_score,
      next_target_score: fd.next_target_score,
      total_time: fd.total_time,
      sections: sectionMemory,
    })

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

function isEmptyNumber(value: number | null | undefined, emptyDefault = 0): boolean {
  return value == null || value === emptyDefault
}

function handleOcrFill(rows: RecognizedSectionDraft[]) {
  let filled = 0
  const usedSectionIds = new Set<string>()

  const nextSections = formData.value.sections.map((section) => {
    const matched = rows.find((row) =>
      !usedSectionIds.has(row.id) &&
      row.section_name === section.section_name &&
      (row.parent_section_name ?? null) === (section.parent_section_name ?? null)
    )
    if (!matched) return section

    usedSectionIds.add(matched.id)
    let changed = false
    const patch: Partial<ExamSectionFormData> = {}

    if (matched.total_questions != null && isEmptyNumber(section.total_questions)) {
      patch.total_questions = matched.total_questions
      changed = true
    }
    if (matched.correct_questions != null && isEmptyNumber(section.correct_questions)) {
      patch.correct_questions = matched.correct_questions
      changed = true
    }
    if (matched.used_time != null && isEmptyNumber(section.used_time)) {
      patch.used_time = matched.used_time
      changed = true
    }
    if (isEmptyNumber(section.per_question_score, 1)) {
      patch.per_question_score = normalizeRecognizedScore(
        formData.value.exam_type_1,
        section.section_name,
        matched.score,
        matched.correct_questions,
      )
      changed = true
    }

    if (changed) filled++
    return { ...section, ...patch }
  })

  formData.value.sections = nextSections

  if (filled === 0) {
    message.info('没有可填充的空字段，已有内容未被覆盖')
    return
  }

  highlightedSections.value = true
  requestAnimationFrame(() => {
    sectionCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  window.setTimeout(() => {
    highlightedSections.value = false
  }, 1800)
  message.success(`已成功填充 ${filled} 个板块数据`)
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
        <ExamForm v-model="formData" :on-field-touch="markTouched" />
      </NCard>

      <!-- 板块成绩表 -->
      <ExamOrderInput
        v-model="formData.question_order"
        :sections="formData.sections"
        style="margin-bottom: 16px"
      />

      <!-- 板块成绩表 -->
      <NCard
        ref="sectionCardRef"
        title="板块成绩"
        :class="{ 'section-filled': highlightedSections }"
      >
        <SectionTable
          v-model:sections="formData.sections"
          :enable-ocr="!isEdit"
          @ocr-fill="handleOcrFill"
        />
      </NCard>

      <!-- 复盘题目模块（三Tab统一管理） -->
      <NCard title="题目复盘" style="margin-top: 16px">
        <ReviewTabs
          v-model:wrong-questions="formData.wrong_questions"
          v-model:speed-questions="formData.speed_questions"
          v-model:fast-correct-questions="formData.fast_correct_questions"
          :parent-section-names="parentSectionNames"
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
.section-filled {
  animation: sectionPulse 1.6s ease;
}
@keyframes sectionPulse {
  0% { box-shadow: 0 0 0 0 rgba(91, 141, 239, 0.42); }
  60% { box-shadow: 0 0 0 8px rgba(91, 141, 239, 0.08); }
  100% { box-shadow: var(--shadow-sm); }
}
</style>
