<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NInput, NInputNumber, NEmpty } from 'naive-ui'
import type { ReviewQuestionFormData } from '@/types/exam'

const props = defineProps<{
  questions: ReviewQuestionFormData[]
  /** 当前一级板块名称列表（与板块成绩联动） */
  parentSectionNames: string[]
  /** Tab 类型，决定显示哪些列 */
  mode: 'wrong' | 'speed' | 'fast'
  /** 是否只读（详情页展示用） */
  readonly?: boolean
  /** 模块标题 */
  title?: string
  /** 提示文字 */
  hint?: string
  /** 空行的描述词 */
  rowLabel?: string
}>()

const emit = defineEmits<{
  'update:questions': [value: ReviewQuestionFormData[]]
}>()

let nextClientId = 1

function generateClientId(): string {
  return `rq-${Date.now()}-${nextClientId++}`
}

function createEmptyQuestion(sectionName: string): ReviewQuestionFormData {
  return {
    client_id: generateClientId(),
    id: 0,
    section_name: sectionName,
    question_number: '',
    time_spent: null,
    knowledge_point: '',
    analysis: '',
    improvement_plan: '',
    solving_insight: '',
  }
}

// 是否为「又快又对的题」模式（仅显示 破题点与解题思路，不显示分析评价/下一步计划）
const isFastMode = computed(() => props.mode === 'fast')

// ============================================================
// 只读模式：合并为单表格，仅展示有记录的板块
// ============================================================
interface FlatQuestion {
  sectionName: string
  question: ReviewQuestionFormData
  isFirstInSection: boolean  // 板块列首行标记
  sectionRowSpan: number      // 该板块总行数（用于视觉合并）
}

const mergedQuestions = computed<FlatQuestion[]>(() => {
  if (!props.readonly) return []
  const result: FlatQuestion[] = []
  // 按 parentSectionNames 顺序遍历，过滤空板块
  for (const secName of props.parentSectionNames) {
    const qs = props.questions.filter((q) => q.section_name === secName)
    if (qs.length === 0) continue
    qs.forEach((q, i) => {
      result.push({
        sectionName: secName,
        question: q,
        isFirstInSection: i === 0,
        sectionRowSpan: qs.length,
      })
    })
  }
  return result
})

// 是否有任何记录
const hasAnyRecords = computed(() => mergedQuestions.value.length > 0)

// 编辑模式按板块分组
interface RqGroup {
  sectionName: string
  questions: ReviewQuestionFormData[]
}

const grouped = computed<RqGroup[]>(() => {
  if (props.readonly) return []
  const map = new Map<string, ReviewQuestionFormData[]>()
  for (const q of props.questions) {
    const list = map.get(q.section_name)
    if (list) list.push(q)
    else map.set(q.section_name, [q])
  }
  return props.parentSectionNames.map((name) => ({
    sectionName: name,
    questions: map.get(name) ?? [],
  }))
})

function updateAll(list: ReviewQuestionFormData[]) {
  emit('update:questions', list)
}

function addQuestion(sectionName: string) {
  updateAll([...props.questions, createEmptyQuestion(sectionName)])
}

function removeQuestion(clientId: string) {
  updateAll(props.questions.filter((q) => q.client_id !== clientId))
}

function updateQuestion(clientId: string, patch: Partial<ReviewQuestionFormData>) {
  const idx = props.questions.findIndex((q) => q.client_id === clientId)
  if (idx >= 0) {
    const updated = [...props.questions]
    updated[idx] = { ...updated[idx], ...patch }
    updateAll(updated)
  }
}
</script>

<template>
  <div class="rq-container">
    <!-- 标题栏（仅编辑模式显示） -->
    <div v-if="!readonly && title" class="rq-header-bar">
      <span class="rq-title">{{ title }}</span>
      <span v-if="hint" class="rq-hint">{{ hint }}</span>
    </div>

    <!-- ============================================================ -->
    <!-- 只读模式：合并单表格 -->
    <!-- ============================================================ -->
    <template v-if="readonly">
      <!-- 全局空状态 -->
      <div v-if="!hasAnyRecords" class="rq-empty">
        <NEmpty description="暂无记录" size="small" />
      </div>

      <!-- 统一表格 -->
      <div v-else class="rq-merged-table">
        <!-- 全局表头 -->
        <div class="rq-row rq-head-row">
          <span class="rq-col merged-section-col">板块</span>
          <span class="rq-col qnum-col">题号</span>
          <span class="rq-col time-col">用时(分)</span>
          <span class="rq-col point-col">考点</span>
          <template v-if="isFastMode">
            <span class="rq-col merged-insight-col">破题点与解题思路</span>
          </template>
          <template v-else>
            <span class="rq-col merged-desc-col">分析评价</span>
            <span class="rq-col merged-desc-col">下一步计划</span>
          </template>
        </div>

        <!-- 数据行 -->
        <div
          v-for="item in mergedQuestions"
          :key="item.question.client_id"
          class="rq-row rq-data-row"
          :class="{ 'section-first': item.isFirstInSection }"
        >
          <!-- 板块列（首行才显示名称，其余留空——视觉合并） -->
          <span
            v-if="item.isFirstInSection"
            class="rq-col merged-section-col merged-section-name"
            :style="{ gridRow: `span ${item.sectionRowSpan}` }"
          >
            {{ item.sectionName }}
          </span>
          <span v-else class="rq-col merged-section-col merged-section-filler" />

          <!-- 题号 -->
          <span class="rq-col qnum-col">{{ item.question.question_number || '--' }}</span>

          <!-- 用时 -->
          <span class="rq-col time-col">
            {{ item.question.time_spent != null ? item.question.time_spent + ' 分钟' : '--' }}
          </span>

          <!-- 考点 -->
          <span class="rq-col point-col">{{ item.question.knowledge_point || '--' }}</span>

          <!-- 分析评价 + 下一步计划（wrong / speed） -->
          <template v-if="!isFastMode">
            <span class="rq-col merged-desc-col">{{ item.question.analysis || '--' }}</span>
            <span class="rq-col merged-desc-col">{{ item.question.improvement_plan || '--' }}</span>
          </template>

          <!-- 破题点与解题思路（fast） -->
          <template v-else>
            <span class="rq-col merged-insight-col">{{ item.question.solving_insight || '--' }}</span>
          </template>
        </div>
      </div>
    </template>

    <!-- ============================================================ -->
    <!-- 编辑模式：按板块分组（保持原有交互不变） -->
    <!-- ============================================================ -->
    <template v-else>
    <div v-for="group in grouped" :key="group.sectionName" class="rq-group">
      <div class="rq-group-header">
        <span class="rq-group-name">{{ group.sectionName }}</span>
        <span v-if="group.questions.length > 0" class="rq-group-count">
          {{ group.questions.length }} {{ rowLabel || '道题目' }}
        </span>
      </div>

      <!-- 表格 -->
      <div v-if="group.questions.length > 0 || readonly" class="rq-table">
        <!-- 表头 -->
        <div class="rq-row rq-head-row">
          <span class="rq-col section-col">板块</span>
          <span class="rq-col qnum-col">题号</span>
          <span class="rq-col time-col">用时(分)</span>
          <span class="rq-col point-col">考点</span>
          <template v-if="isFastMode">
            <span class="rq-col insight-col">破题点与解题思路</span>
          </template>
          <template v-else>
            <span class="rq-col desc-col">分析评价</span>
            <span class="rq-col desc-col">下一步计划</span>
          </template>
          <span v-if="!readonly" class="rq-col action-col">操作</span>
        </div>

        <!-- 数据行 -->
        <div
          v-for="(q, idx) in group.questions"
          :key="q.client_id"
          class="rq-row rq-data-row"
        >
          <!-- 板块列（首行显示） -->
          <span class="rq-col section-col">
            <span v-if="idx === 0" class="section-label">{{ group.sectionName }}</span>
          </span>

          <!-- 题号 -->
          <span class="rq-col qnum-col">
            <template v-if="readonly">{{ q.question_number || '--' }}</template>
            <NInput v-else :value="q.question_number" @update:value="(v: string) => updateQuestion(q.client_id, { question_number: v })" size="small" placeholder="如 5" />
          </span>

          <!-- 用时 -->
          <span class="rq-col time-col">
            <template v-if="readonly">{{ q.time_spent != null ? q.time_spent + ' 分钟' : '--' }}</template>
            <NInputNumber v-else :value="q.time_spent" @update:value="(v: number | null) => updateQuestion(q.client_id, { time_spent: v })" size="small" :min="0" placeholder="分钟" />
          </span>

          <!-- 考点 -->
          <span class="rq-col point-col">
            <template v-if="readonly">{{ q.knowledge_point || '--' }}</template>
            <NInput v-else :value="q.knowledge_point" @update:value="(v: string) => updateQuestion(q.client_id, { knowledge_point: v })" size="small" placeholder="如 成语辨析" />
          </span>

          <!-- 分析评价 + 下一步计划（wrong / speed） -->
          <template v-if="!isFastMode">
            <span class="rq-col desc-col">
              <template v-if="readonly">{{ q.analysis || '--' }}</template>
              <NInput v-else :value="q.analysis" @update:value="(v: string) => updateQuestion(q.client_id, { analysis: v })" type="textarea" size="small" placeholder="错因复盘..." :autosize="{ minRows: 1, maxRows: 2 }" />
            </span>
            <span class="rq-col desc-col">
              <template v-if="readonly">{{ q.improvement_plan || '--' }}</template>
              <NInput v-else :value="q.improvement_plan" @update:value="(v: string) => updateQuestion(q.client_id, { improvement_plan: v })" type="textarea" size="small" placeholder="改进方案..." :autosize="{ minRows: 1, maxRows: 2 }" />
            </span>
          </template>

          <!-- 破题点与解题思路（fast） -->
          <template v-else>
            <span class="rq-col insight-col">
              <template v-if="readonly">{{ q.solving_insight || '--' }}</template>
              <NInput v-else :value="q.solving_insight" @update:value="(v: string) => updateQuestion(q.client_id, { solving_insight: v })" type="textarea" size="small" placeholder="破题思路与解题技巧..." :autosize="{ minRows: 1, maxRows: 2 }" />
            </span>
          </template>

          <!-- 删除（仅编辑模式） -->
          <span v-if="!readonly" class="rq-col action-col">
            <NButton type="error" size="tiny" quaternary @click="removeQuestion(q.client_id)">删除</NButton>
          </span>
        </div>

        <!-- 空组占位（仅 readonly 模式下无数据时显示） -->
        <div v-if="readonly && group.questions.length === 0" class="rq-row rq-data-row">
          <span class="rq-col section-col">
            <span class="section-label">{{ group.sectionName }}</span>
          </span>
          <span class="rq-col" style="flex:1; color: var(--text-tertiary); font-size: 12px; padding: 8px 0;">暂无记录</span>
        </div>
      </div>

      <!-- 添加按钮（仅编辑模式） -->
      <div v-if="!readonly" class="rq-add-bar">
        <NButton size="small" type="primary" dashed @click="addQuestion(group.sectionName)">
          + 添加{{ rowLabel || '题目' }}
        </NButton>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.rq-container { margin-top: 0; }

.rq-header-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.rq-title   { font-weight: 600; font-size: 15px; }
.rq-hint    { font-size: 12px; color: var(--text-tertiary); }
.rq-empty   { padding: 24px 0; }

/* ============================================================
   只读模式：合并单表格
   ============================================================ */
.rq-merged-table {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  overflow-x: auto;
}

/* 板块列 */
.merged-section-col { width: 100px; }
.merged-section-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg-page);
  justify-content: center;
  text-align: center;
  align-self: stretch;
}
.merged-section-filler {
  background: var(--bg-page);
}
/* 板块首行的数据列也加浅背景区分 */
.section-first .qnum-col,
.section-first .time-col,
.section-first .point-col {
  background: var(--bg-page);
}

/* section 间加粗分隔 */
.section-first {
  border-top: 2px solid var(--border-light);
}

.merged-desc-col   { flex: 1; min-width: 140px; padding-right: 6px; }
.merged-insight-col { flex: 2; min-width: 280px; padding-right: 6px; }

/* 编辑模式板块分组 */
.rq-group {
  margin-bottom: 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  overflow: hidden;
}
.rq-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-light);
}
.rq-group-name  { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.rq-group-count { font-size: 11px; color: var(--text-tertiary); }

/* 表格共用 */
.rq-table    { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.rq-row      { display: flex; align-items: flex-start; border-bottom: 1px solid var(--border-light); min-width: 900px; }
.rq-head-row { background: var(--bg-page); font-size: 11px; font-weight: 600; color: var(--text-secondary); padding: 8px 14px; }
.rq-data-row { padding: 8px 14px; align-items: center; transition: background-color 0.1s; }
.rq-data-row:hover { background-color: var(--bg-hover); }
.rq-data-row:last-child { border-bottom: none; }

.rq-col { flex-shrink: 0; display: flex; align-items: center; }
.section-col  { width: 90px; }
.qnum-col     { width: 80px; padding-right: 6px; }
.time-col     { width: 90px; padding-right: 6px; }
.point-col    { width: 110px; padding-right: 6px; }
.desc-col     { flex: 1; min-width: 150px; padding-right: 6px; }
.insight-col  { flex: 2; min-width: 300px; padding-right: 6px; }
.action-col   { width: 50px; justify-content: center; }

.section-label { font-size: 12px; font-weight: 600; color: var(--primary); }

.rq-add-bar {
  padding: 8px 14px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px dashed var(--border-light);
}

@media (max-width: 1199px) {
  .rq-row { min-width: 900px; }
}
</style>
