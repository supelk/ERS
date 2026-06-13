<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { NCard, NSpin, NEmpty, NSelect, NH3, NGrid, NGi, NButton } from 'naive-ui'
import { useAnalysisStore } from '@/stores/analysis'
import TrendLineChart from '@/components/analysis/TrendLineChart.vue'
import { EXAM_TYPE_1_OPTIONS, EXAM_TYPE_OPTIONS } from '@/utils/constants'
import type { TrendPoint, MultiExamSectionTrend, ExamType1, ExamType } from '@/types/exam'

const analysisStore = useAnalysisStore()
const loading = ref(true)

const filterType1 = ref<ExamType1 | ''>('')
const filterType = ref<ExamType | ''>('')

const scoreTrend = ref<TrendPoint[]>([])
const allSectionTrends = ref<MultiExamSectionTrend[]>([])

const type1Options = [
  { label: '全部分类', value: '' },
  ...EXAM_TYPE_1_OPTIONS,
]
const typeOptions = [
  { label: '全部类型', value: '' },
  ...EXAM_TYPE_OPTIONS,
]

async function loadData() {
  loading.value = true
  try {
    const t1 = filterType1.value || ''
    const t2 = filterType.value || ''
    scoreTrend.value = await analysisStore.getScoreTrend(t1, t2)
    allSectionTrends.value = await analysisStore.getAllSectionTrends(t1, t2)
  } catch (e) {
    console.error('Failed to load trend data:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

watch([filterType1, filterType], loadData)

const scoreTrendChart = computed(() => ({
  xLabels: scoreTrend.value.map((p: TrendPoint) => p.label),
  series: [
    {
      name: '总分',
      data: scoreTrend.value.map((p: TrendPoint) => parseFloat(p.value.toFixed(1))),
    },
  ],
}))

const filterLabel = computed(() => {
  const parts = []
  if (filterType1.value) parts.push(filterType1.value)
  if (filterType.value) parts.push(filterType.value)
  return parts.length > 0 ? ' · ' + parts.join(' · ') : ''
})
</script>

<template>
  <div>
    <div class="trend-header">
      <h2 class="trend-title">趋势分析</h2>
    </div>

    <!-- 筛选栏 — 轻量化 -->
    <div class="filter-bar">
      <div class="filter-left">
        <span class="filter-label">筛选条件：</span>
        <NSelect
          v-model:value="filterType1"
          :options="type1Options"
          placeholder="考试分类"
          style="width: 130px"
          size="small"
        />
        <NSelect
          v-model:value="filterType"
          :options="typeOptions"
          placeholder="考试类型"
          style="width: 140px"
          size="small"
        />
        <NButton
          v-if="filterType1 || filterType"
          size="small"
          quaternary
          @click="filterType1 = ''; filterType = ''"
        >
          清除筛选
        </NButton>
      </div>
      <span class="record-count">
        匹配 {{ scoreTrend.length }} 场考试
      </span>
    </div>

    <NSpin :show="loading">
      <template v-if="!loading && scoreTrend.length === 0">
        <NEmpty description="当前筛选条件下还没有考试数据" />
      </template>

      <template v-if="scoreTrend.length > 0">
        <!-- 总分趋势 -->
        <NCard style="margin-bottom: 24px">
          <TrendLineChart
            :title="`总分趋势${filterLabel}`"
            :x-labels="scoreTrendChart.xLabels"
            :series="scoreTrendChart.series"
            y-axis-name="总分"
          />
        </NCard>

        <!-- 所有一级板块正确率趋势 -->
        <NH3 style="margin: 0 0 16px; font-weight: 600">一级板块正确率趋势</NH3>
        <p v-if="allSectionTrends.length === 0" style="color: var(--text-tertiary); padding: 24px 0; text-align: center">
          暂无一级板块数据。请确保在录入考试时选择了一级板块（如：判断推理、言语理解等）。
        </p>
        <NGrid v-else :cols="2" :x-gap="16">
          <NGi v-for="trend in allSectionTrends" :key="trend.section_name">
            <NCard size="small" style="margin-bottom: 12px">
              <TrendLineChart
                :title="trend.section_name"
                :x-labels="trend.dataPoints.map((p: TrendPoint) => p.label)"
                :series="[{
                  name: `${trend.section_name} 正确率`,
                  data: trend.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(1))),
                }]"
                y-axis-name="%"
              />
            </NCard>
          </NGi>
        </NGrid>
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.trend-header {
  margin-bottom: 18px;
}
.trend-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}

/* 筛选栏 — 轻量化 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}
.filter-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.filter-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}
.record-count {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
</style>
