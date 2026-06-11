<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { NCard, NDivider, NSpin, NEmpty, NSelect, NH3, NGrid, NGi, NButton, NSpace } from 'naive-ui'
import { useAnalysisStore } from '@/stores/analysis'
import TrendLineChart from '@/components/analysis/TrendLineChart.vue'
import { EXAM_TYPE_1_OPTIONS, EXAM_TYPE_OPTIONS } from '@/utils/constants'
import type { TrendPoint, MultiExamSectionTrend, ExamType1, ExamType } from '@/types/exam'

const analysisStore = useAnalysisStore()
const loading = ref(true)

// 筛选条件
const filterType1 = ref<ExamType1 | ''>('')
const filterType = ref<ExamType | ''>('')

// 数据
const scoreTrend = ref<TrendPoint[]>([])
const allSectionTrends = ref<MultiExamSectionTrend[]>([])

// 筛选选项
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

// 筛选变化时重新加载
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
      <h2 style="margin: 0">趋势分析</h2>
    </div>

    <!-- 筛选栏 -->
    <NCard size="small" style="margin-bottom: 16px">
      <NSpace align="center">
        <span style="font-weight: 600; font-size: 14px">筛选条件：</span>
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
        <span style="color: #999; font-size: 12px; margin-left: auto">
          匹配 {{ scoreTrend.length }} 场考试
        </span>
      </NSpace>
    </NCard>

    <NSpin :show="loading">
      <template v-if="!loading && scoreTrend.length === 0">
        <NEmpty description="当前筛选条件下还没有考试数据" />
      </template>

      <template v-if="scoreTrend.length > 0">
        <!-- 总分趋势 -->
        <NCard>
          <TrendLineChart
            :title="`总分趋势${filterLabel}`"
            :x-labels="scoreTrendChart.xLabels"
            :series="scoreTrendChart.series"
            y-axis-name="总分"
          />
        </NCard>

        <NDivider />

        <!-- 所有一级板块正确率趋势 -->
        <NH3>一级板块正确率趋势</NH3>
        <p v-if="allSectionTrends.length === 0" style="color: #999; padding: 24px 0">
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
  margin-bottom: 16px;
}
</style>
