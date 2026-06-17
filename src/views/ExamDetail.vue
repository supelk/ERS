<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NGrid, NGi, NSpin, NEmpty, NButton, NSpace, useMessage } from 'naive-ui'
import { useExamStore } from '@/stores/exam'
import { useAnalysisStore } from '@/stores/analysis'
import SummaryStats from '@/components/analysis/SummaryStats.vue'
import ComparisonCard from '@/components/analysis/ComparisonCard.vue'
import ScorePieChart from '@/components/analysis/ScorePieChart.vue'
import AccuracyBarChart from '@/components/analysis/AccuracyBarChart.vue'
import ReviewTabs from '@/components/exam/ReviewTabs.vue'
import type { ExamSectionRecord, SectionComparison, TimeDistribution } from '@/types/exam'
import { formatPercent, formatNumber, formatDate } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const examStore = useExamStore()
const analysisStore = useAnalysisStore()

const examId = Number(route.params.id)
const loading = ref(true)

const summary = ref<any>(null)
const comparisonData = ref<SectionComparison[]>([])
const timeDistData = ref<TimeDistribution[]>([])

onMounted(async () => {
  loading.value = true
  try {
    await examStore.fetchExamById(examId)
    if (examStore.currentExam) {
      summary.value = await analysisStore.getExamSummary(examId)
      comparisonData.value = await analysisStore.getSectionComparisons(examId)
      timeDistData.value = await analysisStore.getTimeDistribution(examId)
    }
  } catch (e) {
    message.error('加载考试详情失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

function goEdit() {
  router.push(`/exams/new?edit=${examId}`)
}

function goBack() {
  router.push('/exams')
}

// 将板块按层级分组：一级板块 + 其下的二级板块
const parentSections = computed(() =>
  examStore.currentSections.filter((s) => !s.parent_section_name)
)
function childrenOf(parentName: string): ExamSectionRecord[] {
  return examStore.currentSections.filter((s) => s.parent_section_name === parentName)
}

// 复盘题目数据（转为组件所需的表单格式）
function toFormData(list: typeof examStore.currentWrongQuestions) {
  return list.map((q) => ({
    client_id: `detail-${q.id}`,
    id: q.id,
    section_name: q.section_name,
    question_number: q.question_number,
    time_spent: q.time_spent,
    knowledge_point: q.knowledge_point,
    analysis: q.analysis,
    improvement_plan: q.improvement_plan,
    solving_insight: q.solving_insight,
  }))
}
const detailWrongQuestions = computed(() => toFormData(examStore.currentWrongQuestions))
const detailSpeedQuestions = computed(() => toFormData(examStore.currentSpeedQuestions))
const detailFastCorrectQuestions = computed(() => toFormData(examStore.currentFastCorrectQuestions))

// 汇总（仅一级板块，与 analysis store 保持一致）
const parentSummary = computed(() => {
  const parents = parentSections.value
  return {
    totalQuestions: parents.reduce((s, r) => s + r.total_questions, 0),
    totalTime: parents.reduce((s, r) => s + r.used_time, 0),
  }
})

// 有无复盘/问题数据
const hasReviewData = computed(() =>
  detailWrongQuestions.value.length > 0 ||
  detailSpeedQuestions.value.length > 0 ||
  detailFastCorrectQuestions.value.length > 0
)
const hasAnalysisData = computed(() =>
  examStore.currentSections.some((s) => s.analysis || s.plan)
)
</script>

<template>
  <div>
    <NSpin :show="loading">
      <template v-if="!loading && !examStore.currentExam">
        <NEmpty description="考试记录不存在" />
      </template>

      <template v-if="examStore.currentExam">
        <!-- 顶栏操作 -->
        <div class="detail-header">
          <div>
            <h2 class="detail-title">{{ examStore.currentExam.exam_name }}</h2>
            <span class="detail-meta">
              {{ formatDate(examStore.currentExam.exam_date) }} ·
              {{ examStore.currentExam.exam_type_1 }} ·
              {{ examStore.currentExam.exam_type }}
            </span>
          </div>
          <NSpace :size="10">
            <NButton @click="goBack">返回列表</NButton>
            <NButton type="primary" @click="goEdit">编辑</NButton>
          </NSpace>
        </div>

        <!-- 汇总统计 -->
        <div class="section-label">概览</div>
        <SummaryStats
          v-if="summary"
          :stats="[
            { label: '本次总分', value: `${summary.total_score} / ${summary.full_score}` },
            { label: '总正确率', value: summary.overall_accuracy.toFixed(1), suffix: '%' },
            { label: '平均正确率', value: summary.avg_accuracy.toFixed(1), suffix: '%' },
            { label: '板块数', value: summary.section_count },
            { label: '总题数', value: summary.total_questions },
            { label: '总用时', value: summary.total_used_time, suffix: '分钟' },
          ]"
        />

        <!-- 板块对比卡片 -->
        <div class="section-label">板块目标对比</div>
        <NGrid :cols="Math.min(comparisonData.length || 3, 5)" :x-gap="12" style="margin-bottom: 16px">
          <NGi v-for="item in comparisonData" :key="item.section_name" :span="2">
            <ComparisonCard :data="item" />
          </NGi>
        </NGrid>

        <!-- 图表 -->
        <NGrid :cols="2" :x-gap="16">
          <NGi>
            <NCard>
              <ScorePieChart v-if="timeDistData.length > 0" :data="timeDistData" />
            </NCard>
          </NGi>
          <NGi>
            <NCard>
              <AccuracyBarChart
                v-if="comparisonData.length > 0"
                :data="comparisonData"
                title="板块正确率"
              />
            </NCard>
          </NGi>
        </NGrid>

        <!-- 板块明细表（层级结构） -->
        <div class="section-label">板块明细</div>
        <div class="hier-table">
          <!-- 表头 -->
          <div class="hier-header">
            <span class="hier-col name-col">板块</span>
            <span class="hier-col num-col">总题数</span>
            <span class="hier-col num-col">答对数</span>
            <span class="hier-col num-col">正确率</span>
            <span class="hier-col num-col">得分效率</span>
            <span class="hier-col num-col">用时(分)</span>
            <span class="hier-col num-col">未作答</span>
            <span class="hier-col num-col">目标正确率</span>
          </div>
          <!-- 行：一级板块 + 嵌套二级板块 -->
          <template v-for="parent in parentSections" :key="parent.section_id">
            <div class="hier-row parent-row">
              <span class="hier-col name-col parent-name">{{ parent.section_name }}</span>
              <span class="hier-col num-col">{{ parent.total_questions }}</span>
              <span class="hier-col num-col">{{ parent.correct_questions }}</span>
              <span class="hier-col num-col" :style="{ color: parent.accuracy >= 80 ? 'var(--success)' : parent.accuracy >= 60 ? 'var(--warning)' : 'var(--error)' }">{{ formatPercent(parent.accuracy) }}</span>
              <span class="hier-col num-col">{{ formatNumber(parent.score_efficiency, 2) }}</span>
              <span class="hier-col num-col">{{ parent.used_time }}</span>
              <span class="hier-col num-col">{{ parent.unattempted_questions }}</span>
              <span class="hier-col num-col">{{ parent.next_target_accuracy != null ? formatPercent(parent.next_target_accuracy) : '--' }}</span>
            </div>
            <div v-for="child in childrenOf(parent.section_name)" :key="child.section_id" class="hier-row child-row">
              <span class="hier-col name-col child-name">└ {{ child.section_name }}</span>
              <span class="hier-col num-col muted">{{ child.total_questions }}</span>
              <span class="hier-col num-col muted">{{ child.correct_questions }}</span>
              <span class="hier-col num-col muted" :style="{ color: child.accuracy >= 80 ? 'var(--success)' : child.accuracy >= 60 ? 'var(--warning)' : 'var(--error)' }">{{ formatPercent(child.accuracy) }}</span>
              <span class="hier-col num-col muted">{{ formatNumber(child.score_efficiency, 2) }}</span>
              <span class="hier-col num-col muted">{{ child.used_time }}</span>
              <span class="hier-col num-col muted">{{ child.unattempted_questions }}</span>
              <span class="hier-col num-col muted">{{ child.next_target_accuracy != null ? formatPercent(child.next_target_accuracy) : '--' }}</span>
            </div>
          </template>
          <!-- 汇总 -->
          <div class="hier-row summary-row">
            <span class="hier-col name-col">合计（{{ parentSections.length }} 个板块）</span>
            <span class="hier-col num-col">{{ parentSummary.totalQuestions }}</span>
            <span class="hier-col num-col">--</span>
            <span class="hier-col num-col">--</span>
            <span class="hier-col num-col">--</span>
            <span class="hier-col num-col">{{ parentSummary.totalTime }}</span>
            <span class="hier-col num-col">--</span>
            <span class="hier-col num-col">--</span>
          </div>
        </div>

        <!-- 题目复盘（三Tab只读展示） -->
        <template v-if="hasReviewData">
        <div class="section-label">题目复盘</div>
        <ReviewTabs
          :wrong-questions="detailWrongQuestions"
          :speed-questions="detailSpeedQuestions"
          :fast-correct-questions="detailFastCorrectQuestions"
          :parent-section-names="parentSections.map(s => s.section_name)"
          :readonly="true"
        />
        </template>

        <!-- 问题汇总（层级结构） -->
        <template v-if="hasAnalysisData">
        <div class="section-label">问题汇总</div>
        <template v-for="parent in parentSections" :key="'analysis-' + parent.section_id">
          <div class="analysis-group">
            <div class="analysis-parent-name">{{ parent.section_name }}</div>
            <!-- 一级板块自身的问题分析 -->
            <NCard v-if="parent.analysis || parent.plan" size="small" class="analysis-card">
              <div v-if="parent.analysis">
                <span class="analysis-label">问题分析：</span>
                <p class="analysis-text">{{ parent.analysis }}</p>
              </div>
              <div v-if="parent.plan">
                <span class="analysis-label">下一步计划：</span>
                <p class="analysis-text">{{ parent.plan }}</p>
              </div>
            </NCard>
            <!-- 子板块问题分析 -->
            <NGrid :cols="2" :x-gap="12" style="margin-left: 20px">
              <NGi v-for="child in childrenOf(parent.section_name)" :key="'ca-' + child.section_id">
                <NCard v-if="child.analysis || child.plan" size="small" :title="child.section_name" class="analysis-card">
                  <div v-if="child.analysis">
                    <span class="analysis-label">问题分析：</span>
                    <p class="analysis-text">{{ child.analysis }}</p>
                  </div>
                  <div v-if="child.plan">
                    <span class="analysis-label">下一步计划：</span>
                    <p class="analysis-text">{{ child.plan }}</p>
                  </div>
                </NCard>
              </NGi>
            </NGrid>
          </div>
        </template>
        <div v-if="!examStore.currentSections.some(s => s.analysis || s.plan)" class="analysis-empty-all">
          暂无问题分析记录
        </div>
        </template>
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}
.detail-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}
.detail-meta {
  color: var(--text-tertiary);
  font-size: 13px;
  margin-top: 4px;
  display: inline-block;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 24px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

/* ============================================================
   层级表格
   ============================================================ */
.hier-table {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}
.hier-header {
  display: flex;
  align-items: center;
  background: var(--bg-page);
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
}
.hier-row {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-light);
  transition: background-color 0.1s;
}
.hier-row:last-child {
  border-bottom: none;
}
.hier-row:hover {
  background-color: var(--bg-hover);
}

.hier-col {
  flex-shrink: 0;
}
.name-col {
  flex: 1;
  min-width: 120px;
}
.num-col {
  width: 78px;
  text-align: center;
}

/* 一级板块行 */
.parent-row {
  background: var(--bg-surface);
}
.parent-name {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 13px;
}

/* 二级板块行 */
.child-row {
  background: var(--primary-light);
}
.child-name {
  font-weight: 500;
  color: var(--primary);
  padding-left: 20px;
  font-size: 12px;
}
.muted {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 汇总行 */
.summary-row {
  background: var(--bg-page);
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary);
  border-top: 2px solid var(--border-light);
}

/* ============================================================
   问题汇总层级
   ============================================================ */
.analysis-group {
  margin-bottom: 16px;
}
.analysis-parent-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid var(--primary);
}
.analysis-card {
  margin-bottom: 8px;
}
.analysis-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}
.analysis-text {
  margin: 4px 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.analysis-empty-all {
  color: var(--text-tertiary);
  text-align: center;
  padding: 32px 0;
  font-size: 14px;
}

</style>
