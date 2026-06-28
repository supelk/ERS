<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { NCard, NSpin, NEmpty, NSelect, NH3, NGrid, NGi, NButton, NDatePicker, NButtonGroup } from 'naive-ui'
import { useAnalysisStore } from '@/stores/analysis'
import TrendLineChart from '@/components/analysis/TrendLineChart.vue'
import HistoryAiDiagnosis from '@/components/analysis/HistoryAiDiagnosis.vue'
import { EXAM_TYPE_1_OPTIONS, EXAM_TYPE_OPTIONS } from '@/utils/constants'
import { computeYRangeFromTrends, computeYRange } from '@/utils/calculations'
import type { TrendPoint, MultiExamSectionTrend, ExamType1, ExamType } from '@/types/exam'

const analysisStore = useAnalysisStore()
const loading = ref(true)

const filterType1 = ref<ExamType1 | ''>('')
const filterType = ref<ExamType | ''>('')
const timeQuickFilter = ref<'month' | 'half-year' | 'all' | 'custom'>('all')
const dateRange = ref<[number, number] | null>(null)
const selectedSection = ref('')

const scoreTrend = ref<TrendPoint[]>([])
const sectionTimeTrends = ref<MultiExamSectionTrend[]>([])
const sectionEfficiencyTrends = ref<MultiExamSectionTrend[]>([])
const allSectionTrends = ref<MultiExamSectionTrend[]>([])
const availableSections = ref<string[]>([])
const showHistoryAi = ref(false)

const type1Options = [
  { label: '全部分类', value: '' },
  ...EXAM_TYPE_1_OPTIONS,
]
const typeOptions = [
  { label: '全部类型', value: '' },
  ...EXAM_TYPE_OPTIONS,
]

const sectionOptions = computed(() => {
  const opts = [{ label: '整体汇总', value: '' }]
  for (const s of availableSections.value) {
    opts.push({ label: s, value: s })
  }
  return opts
})

// -------- 选中单个板块时的三项指标 --------
const selectedTimeTrend = computed(() =>
  sectionTimeTrends.value.find((t) => t.section_name === selectedSection.value) ?? null,
)
const selectedEfficiencyTrend = computed(() =>
  sectionEfficiencyTrends.value.find((t) => t.section_name === selectedSection.value) ?? null,
)
const selectedAccuracyTrend = computed(() =>
  allSectionTrends.value.find((t) => t.section_name === selectedSection.value) ?? null,
)
const aiSectionTimeTrends = computed(() =>
  selectedSection.value
    ? sectionTimeTrends.value.filter((t) => t.section_name === selectedSection.value)
    : sectionTimeTrends.value
)
const aiSectionEfficiencyTrends = computed(() =>
  selectedSection.value
    ? sectionEfficiencyTrends.value.filter((t) => t.section_name === selectedSection.value)
    : sectionEfficiencyTrends.value
)
const aiSectionAccuracyTrends = computed(() =>
  selectedSection.value
    ? allSectionTrends.value.filter((t) => t.section_name === selectedSection.value)
    : allSectionTrends.value
)

// -------- Y 轴动态范围 --------
const scoreYRange = computed(() => computeYRange(scoreTrend.value.map((p) => p.value)))

function trendYRange(trend: MultiExamSectionTrend) {
  return computeYRange(trend.dataPoints.map((p) => p.value))
}

const timeGridYRange = computed(() => computeYRangeFromTrends(sectionTimeTrends.value))
const effGridYRange = computed(() => computeYRangeFromTrends(sectionEfficiencyTrends.value))

async function loadData() {
  loading.value = true
  try {
    const t1 = filterType1.value || ''
    const t2 = filterType.value || ''
    const range = activeDateRange()
    const from = range.from
    const to = range.to
    const [st, sst, set, ast, secs] = await Promise.all([
      analysisStore.getScoreTrend(t1, t2, from, to),
      analysisStore.getSectionTimeTrends(t1, t2, from, to),
      analysisStore.getSectionEfficiencyTrends(t1, t2, from, to),
      analysisStore.getAllSectionTrends(t1, t2, from, to),
      analysisStore.getAvailableSections(t1, t2, from, to),
    ])
    scoreTrend.value = st
    sectionTimeTrends.value = sst
    sectionEfficiencyTrends.value = set
    allSectionTrends.value = ast
    availableSections.value = secs
    // 若当前选中板块在新筛选中不存在，回退到整体汇总
    if (selectedSection.value && !secs.includes(selectedSection.value)) {
      selectedSection.value = ''
    }
  } catch (e) {
    console.error('Failed to load trend data:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch([filterType1, filterType, timeQuickFilter, dateRange], loadData)

const scoreTrendChart = computed(() => ({
  xLabels: scoreTrend.value.map((p: TrendPoint) => p.label),
  series: [{ name: '总分', data: scoreTrend.value.map((p) => parseFloat(p.value.toFixed(1))) }],
}))

const filterLabel = computed(() => {
  const parts = []
  if (filterType1.value) parts.push(filterType1.value)
  if (filterType.value) parts.push(filterType.value)
  const range = activeDateRange()
  if (range.from || range.to) parts.push(`${range.from || '不限'} 至 ${range.to || '不限'}`)
  if (selectedSection.value) parts.push(selectedSection.value)
  return parts.length > 0 ? ' · ' + parts.join(' · ') : ''
})

const isOverall = computed(() => !selectedSection.value)

function dateRangeToStrings(value: [number, number] | null): { from: string; to: string } {
  if (!value) return { from: '', to: '' }
  return {
    from: timestampToDate(value[0]),
    to: timestampToDate(value[1]),
  }
}

function activeDateRange(): { from: string; to: string } {
  if (timeQuickFilter.value === 'all') return { from: '', to: '' }
  if (timeQuickFilter.value === 'custom') return dateRangeToStrings(dateRange.value)

  const end = new Date()
  const start = new Date(end)
  if (timeQuickFilter.value === 'month') {
    start.setMonth(start.getMonth() - 1)
  } else {
    start.setMonth(start.getMonth() - 6)
  }
  return {
    from: timestampToDate(start.getTime()),
    to: timestampToDate(end.getTime()),
  }
}

function timestampToDate(value: number): string {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function clearFilters() {
  filterType1.value = ''
  filterType.value = ''
  timeQuickFilter.value = 'all'
  dateRange.value = null
  selectedSection.value = ''
}

function setQuickFilter(value: 'month' | 'half-year' | 'all' | 'custom') {
  timeQuickFilter.value = value
  if (value !== 'custom') {
    dateRange.value = null
  }
}

function jumpToSection(sectionName: string) {
  if (availableSections.value.includes(sectionName)) {
    selectedSection.value = sectionName
  }
}
</script>

<template>
  <div>
    <div class="trend-header">
      <h2 class="trend-title">趋势分析</h2>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <span class="filter-label">筛选条件：</span>
        <NSelect v-model:value="filterType1" :options="type1Options" placeholder="考试分类" style="width: 130px" size="small" />
        <NSelect v-model:value="filterType" :options="typeOptions" placeholder="考试类型" style="width: 140px" size="small" />
        <NButtonGroup size="small">
          <NButton :type="timeQuickFilter === 'month' ? 'primary' : 'default'" @click="setQuickFilter('month')">
            近一月
          </NButton>
          <NButton :type="timeQuickFilter === 'half-year' ? 'primary' : 'default'" @click="setQuickFilter('half-year')">
            近半年
          </NButton>
          <NButton :type="timeQuickFilter === 'all' ? 'primary' : 'default'" @click="setQuickFilter('all')">
            所有
          </NButton>
          <NButton :type="timeQuickFilter === 'custom' ? 'primary' : 'default'" @click="setQuickFilter('custom')">
            自定义
          </NButton>
        </NButtonGroup>
        <NDatePicker
          v-if="timeQuickFilter === 'custom'"
          v-model:value="dateRange"
          type="daterange"
          size="small"
          clearable
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px"
        />
        <span class="filter-divider">|</span>
        <span class="filter-label">查看维度：</span>
        <NSelect v-model:value="selectedSection" :options="sectionOptions" placeholder="选择板块" style="width: 160px" size="small" />
        <NButton v-if="filterType1 || filterType || timeQuickFilter !== 'all' || selectedSection" size="small" quaternary
          @click="clearFilters">
          清除筛选
        </NButton>
      </div>
      <div class="filter-actions">
        <span class="record-count">匹配 {{ scoreTrend.length }} 场考试</span>
        <NButton size="small" type="primary" secondary @click="showHistoryAi = !showHistoryAi">
          AI 历史诊断
        </NButton>
      </div>
    </div>

    <HistoryAiDiagnosis
      v-model:show="showHistoryAi"
      :filter-label="filterLabel.replace(/^ · /, '')"
      :selected-section="selectedSection"
      :score-trend="scoreTrend"
      :section-time-trends="aiSectionTimeTrends"
      :section-efficiency-trends="aiSectionEfficiencyTrends"
      :section-accuracy-trends="aiSectionAccuracyTrends"
      @jump-section="jumpToSection"
    />

    <NSpin :show="loading">
      <template v-if="!loading && scoreTrend.length === 0">
        <NEmpty description="当前筛选条件下还没有考试数据" />
      </template>

      <template v-if="scoreTrend.length > 0">
        <!-- ============================================================ -->
        <!-- 整体汇总视图 -->
        <!-- ============================================================ -->
        <template v-if="isOverall">
          <!-- 总分趋势 -->
          <NCard style="margin-bottom: 20px">
            <TrendLineChart
              :title="`总分趋势${filterLabel}`"
              :x-labels="scoreTrendChart.xLabels"
              :series="scoreTrendChart.series"
              y-axis-name="总分"
              :y-max="scoreYRange.max"
            />
          </NCard>

          <!-- 板块用时趋势 -->
          <NH3 style="margin: 0 0 12px; font-weight: 600">一级板块用时趋势</NH3>
          <p v-if="sectionTimeTrends.length === 0" class="empty-hint">暂无板块用时数据</p>
          <NGrid v-else :cols="2" :x-gap="16" style="margin-bottom: 20px">
            <NGi v-for="trend in sectionTimeTrends" :key="'time-' + trend.section_name">
              <NCard size="small" style="margin-bottom: 12px">
                <TrendLineChart
                  :title="trend.section_name"
                  :x-labels="trend.dataPoints.map((p: TrendPoint) => p.label)"
                  :series="[{ name: trend.section_name + ' 用时', data: trend.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(1))) }]"
                  y-axis-name="分钟"
                  :y-max="timeGridYRange.max"
                />
              </NCard>
            </NGi>
          </NGrid>

          <!-- 板块得分效率趋势 -->
          <NH3 style="margin: 0 0 12px; font-weight: 600">一级板块得分效率趋势</NH3>
          <p v-if="sectionEfficiencyTrends.length === 0" class="empty-hint">暂无板块效率数据</p>
          <NGrid v-else :cols="2" :x-gap="16" style="margin-bottom: 20px">
            <NGi v-for="trend in sectionEfficiencyTrends" :key="'eff-' + trend.section_name">
              <NCard size="small" style="margin-bottom: 12px">
                <TrendLineChart
                  :title="trend.section_name"
                  :x-labels="trend.dataPoints.map((p: TrendPoint) => p.label)"
                  :series="[{ name: trend.section_name + ' 得分效率', data: trend.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(3))) }]"
                  y-axis-name="分/分钟"
                  :y-max="effGridYRange.max"
                />
              </NCard>
            </NGi>
          </NGrid>

          <!-- 板块正确率趋势 -->
          <NH3 style="margin: 0 0 12px; font-weight: 600">一级板块正确率趋势</NH3>
          <p v-if="allSectionTrends.length === 0" class="empty-hint">暂无板块正确率数据</p>
          <NGrid v-else :cols="2" :x-gap="16">
            <NGi v-for="trend in allSectionTrends" :key="'acc-' + trend.section_name">
              <NCard size="small" style="margin-bottom: 12px">
                <TrendLineChart
                  :title="trend.section_name"
                  :x-labels="trend.dataPoints.map((p: TrendPoint) => p.label)"
                  :series="[{ name: trend.section_name + ' 正确率', data: trend.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(1))) }]"
                  y-axis-name="%"
                  :y-max="100"
                />
              </NCard>
            </NGi>
          </NGrid>
        </template>

        <!-- ============================================================ -->
        <!-- 单板块详情视图 -->
        <!-- ============================================================ -->
        <template v-else>
          <template v-if="!selectedAccuracyTrend">
            <NEmpty description="该板块暂无历史数据" style="padding: 48px 0" />
          </template>
          <template v-else>
            <NGrid :cols="1" style="margin-bottom: 16px">
              <NGi>
                <NCard>
                  <TrendLineChart
                    :title="`${selectedSection} 用时${filterLabel}`"
                    :x-labels="selectedAccuracyTrend.dataPoints.map((p: TrendPoint) => p.label)"
                    :series="[{
                      name: selectedSection + ' 用时',
                      data: selectedTimeTrend?.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(1))) ?? [],
                    }]"
                    y-axis-name="分钟"
                    :y-max="selectedTimeTrend ? trendYRange(selectedTimeTrend).max : undefined"
                  />
                </NCard>
              </NGi>
            </NGrid>
            <NGrid :cols="2" :x-gap="16">
              <NGi>
                <NCard>
                  <TrendLineChart
                    :title="`${selectedSection} 得分效率${filterLabel}`"
                    :x-labels="selectedAccuracyTrend.dataPoints.map((p: TrendPoint) => p.label)"
                    :series="[{
                      name: selectedSection + ' 得分效率',
                      data: selectedEfficiencyTrend?.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(3))) ?? [],
                    }]"
                    y-axis-name="分/分钟"
                    :y-max="selectedEfficiencyTrend ? trendYRange(selectedEfficiencyTrend).max : undefined"
                  />
                </NCard>
              </NGi>
              <NGi>
                <NCard>
                  <TrendLineChart
                    :title="`${selectedSection} 正确率${filterLabel}`"
                    :x-labels="selectedAccuracyTrend.dataPoints.map((p: TrendPoint) => p.label)"
                    :series="[{
                      name: selectedSection + ' 正确率',
                      data: selectedAccuracyTrend.dataPoints.map((p: TrendPoint) => parseFloat(p.value.toFixed(1))),
                    }]"
                    y-axis-name="%"
                    :y-max="100"
                  />
                </NCard>
              </NGi>
            </NGrid>
          </template>
        </template>
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.trend-header { margin-bottom: 18px; }
.trend-title { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
  gap: 8px;
}
.filter-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-label { font-weight: 600; font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.filter-divider { color: var(--border); font-size: 14px; margin: 0 4px; }
.record-count { font-size: 12px; color: var(--text-tertiary); flex-shrink: 0; }
.filter-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.empty-hint { color: var(--text-tertiary); padding: 24px 0; text-align: center; font-size: 13px; }
</style>
