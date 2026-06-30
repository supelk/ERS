<script setup lang="ts">
import { h, ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NDataTable,
  NButton,
  NSpace,
  NInput,
  NSelect,
  NTag,
  NPopconfirm,
  NEmpty,
  NSpin,
  NPagination,
  NCard,
  NGrid,
  NGi,
  NDrawer,
  NDrawerContent,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import TrendLineChart from '@/components/analysis/TrendLineChart.vue'
import { usePracticeStore } from '@/stores/practice'
import type { PracticeRecord } from '@/types/exam'
import { formatDate, formatPercent, formatNumber } from '@/utils/formatters'
import { PARENT_SECTIONS, getChildrenOf, isParentSection } from '@/utils/constants'
import { computeYRange } from '@/utils/calculations'

const router = useRouter()
const message = useMessage()
const practiceStore = usePracticeStore()

const loading = ref(true)
const searchKeyword = ref('')
const filterSection = ref('')
const page = ref(1)
const pageSize = 20
const selectedRecord = ref<PracticeRecord | null>(null)
const showNotesDrawer = ref(false)

const trendFilterSection = ref('')
const trends = ref<{
  xLabels: string[]
  accuracyData: number[]
  avgTimeData: number[]
  totalQuestionsData: number[]
}>({
  xLabels: [],
  accuracyData: [],
  avgTimeData: [],
  totalQuestionsData: [],
})
const trendSections = ref<string[]>([])

const sectionOptions = computed(() => [
  { label: '全部板块', value: '' },
  ...PARENT_SECTIONS,
])

const trendSectionOptions = computed(() => [
  { label: '全部板块', value: '' },
  ...trendSections.value.map((s) => ({ label: s, value: s })),
])

const filteredData = computed(() => {
  let list = practiceStore.records
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter((r) => r.section_name.toLowerCase().includes(kw))
  }
  if (filterSection.value) {
    const names = getPracticeSectionGroup(filterSection.value)
    list = list.filter((r) => names.includes(r.section_name))
  }
  return list
})

function getPracticeSectionGroup(sectionName: string): string[] {
  if (!isParentSection(sectionName)) return [sectionName]
  const names = [sectionName, ...getChildrenOf(sectionName)]
  if (sectionName === '言语理解') names.push('片段&表达')
  return names
}

const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

const accuracyChartData = computed(() => ({
  xLabels: trends.value.xLabels,
  series: [{ name: '正确率', data: trends.value.accuracyData.map((v) => parseFloat(v.toFixed(1))) }],
}))

const avgTimeChartData = computed(() => ({
  xLabels: trends.value.xLabels,
  series: [{ name: '每题平均用时', data: trends.value.avgTimeData.map((v) => parseFloat(v.toFixed(2))) }],
}))

const totalQuestionsChartData = computed(() => ({
  xLabels: trends.value.xLabels,
  series: [{ name: '总题量', data: trends.value.totalQuestionsData }],
}))

const avgTimeYRange = computed(() => computeYRange(trends.value.avgTimeData))
const totalQYRange = computed(() => computeYRange(trends.value.totalQuestionsData))

const columns: DataTableColumns<PracticeRecord> = [
  {
    title: '练习日期',
    key: 'practice_date',
    width: 110,
    render(row) {
      return formatDate(row.practice_date)
    },
  },
  {
    title: '所属板块',
    key: 'section_name',
    width: 100,
    render(row) {
      return h(NTag, {
        size: 'small',
        style: {
          backgroundColor: 'var(--info-bg)',
          color: 'var(--info)',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 500,
        },
      }, { default: () => row.section_name })
    },
  },
  {
    title: '总题量',
    key: 'total_questions',
    width: 80,
    align: 'center',
  },
  {
    title: '正确率',
    key: 'accuracy',
    width: 90,
    align: 'center',
    render(row) {
      const color = row.accuracy >= 80 ? 'var(--success)' : row.accuracy >= 60 ? 'var(--warning)' : 'var(--error)'
      return h('span', { style: { fontWeight: 600, color } }, formatPercent(row.accuracy))
    },
  },
  {
    title: '平均用时',
    key: 'avg_time_per_question',
    width: 100,
    align: 'center',
    render(row) {
      return formatNumber(row.avg_time_per_question, 2) + ' 分/题'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render(row) {
      return h(NSpace, { size: 6 }, {
        default: () => [
          h(NButton, {
            size: 'small',
            style: {
              backgroundColor: 'var(--text-primary)',
              color: '#fff',
              borderRadius: '6px',
              fontWeight: 500,
              border: 'none',
            },
            onClick: (e: Event) => {
              e.stopPropagation()
              router.push(`/practice/${row.id}`)
            },
          }, { default: () => '查看' }),
          h(NButton, {
            size: 'small',
            style: {
              backgroundColor: 'var(--bg-page)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              fontWeight: 500,
              border: 'none',
            },
            onClick: (e: Event) => {
              e.stopPropagation()
              router.push(`/practice/new?edit=${row.id}`)
            },
          }, { default: () => '编辑' }),
          h(
            NPopconfirm,
            {
              onPositiveClick: (e: Event) => {
                e?.stopPropagation()
                handleDelete(row.id)
              },
            },
            {
              default: () => '确认删除此练习记录？',
              trigger: () =>
                h(NButton, {
                  size: 'small',
                  style: {
                    backgroundColor: 'var(--error-bg)',
                    color: 'var(--error)',
                    borderRadius: '6px',
                    fontWeight: 500,
                    border: 'none',
                  },
                  onClick: (e: Event) => e.stopPropagation(),
                }, { default: () => '删除' }),
            }
          ),
        ],
      })
    },
  },
]

async function loadTrends() {
  try {
    trends.value = await practiceStore.getTrends(
      trendFilterSection.value || undefined,
    )
  } catch (e) {
    console.error('Failed to load trends:', e)
  }
}

async function loadAll() {
  loading.value = true
  try {
    await practiceStore.fetchRecords()
    const [sections] = await Promise.all([
      practiceStore.getAvailableSections(),
      loadTrends(),
    ])
    trendSections.value = sections
  } catch (e) {
    message.error('加载失败: ' + String(e))
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
watch(trendFilterSection, () => {
  loadTrends()
})

async function handleDelete(id: number) {
  try {
    await practiceStore.deleteRecord(id)
    message.success('已删除')
  } catch (e) {
    message.error('删除失败: ' + String(e))
  }
}

function goCreate() {
  router.push('/practice/new')
}

function openNotesDrawer(row: PracticeRecord) {
  selectedRecord.value = row
  showNotesDrawer.value = true
}

function rowProps(row: PracticeRecord) {
  return {
    class: 'clickable-row',
    onClick: () => openNotesDrawer(row),
  }
}
</script>

<template>
  <div>
    <NSpin :show="loading">
      <div class="top-bar">
        <h2 class="page-title">专项练习</h2>
        <NButton type="primary" size="medium" @click="goCreate">
          <span style="margin-right: 2px">+</span> 添加练习
        </NButton>
      </div>

      <template v-if="trends.xLabels.length > 0">
        <div class="section-label">专项练习趋势</div>
        <div class="trend-filter-bar">
          <span class="filter-label">查看维度：</span>
          <NSelect
            v-model:value="trendFilterSection"
            :options="trendSectionOptions"
            placeholder="选择板块"
            style="width: 160px"
            size="small"
          />
        </div>

        <NGrid :cols="3" :x-gap="16" style="margin-bottom: 24px">
          <NGi>
            <NCard size="small">
              <TrendLineChart
                title="正确率趋势"
                :x-labels="accuracyChartData.xLabels"
                :series="accuracyChartData.series"
                y-axis-name="%"
                :y-max="100"
              />
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small">
              <TrendLineChart
                title="平均用时趋势"
                :x-labels="avgTimeChartData.xLabels"
                :series="avgTimeChartData.series"
                y-axis-name="分/题"
                :y-max="avgTimeYRange.max"
              />
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small">
              <TrendLineChart
                title="总题量趋势"
                :x-labels="totalQuestionsChartData.xLabels"
                :series="totalQuestionsChartData.series"
                y-axis-name="题"
                :y-max="totalQYRange.max"
              />
            </NCard>
          </NGi>
        </NGrid>
      </template>

      <div class="section-label">练习记录</div>
      <div class="filter-bar">
        <div class="filter-left">
          <NInput
            v-model:value="searchKeyword"
            placeholder="搜索板块名称..."
            clearable
            style="width: 220px"
          />
          <NSelect
            v-model:value="filterSection"
            :options="sectionOptions"
            style="width: 140px"
          />
        </div>
      </div>

      <div v-if="filteredData.length === 0 && !loading" class="empty-wrap">
        <NEmpty description="暂无专项练习记录">
          <template #extra>
            <NButton type="primary" @click="goCreate">录入第一次练习</NButton>
          </template>
        </NEmpty>
      </div>
      <template v-else-if="filteredData.length > 0">
        <NDataTable
          :columns="columns"
          :data="pagedData"
          :row-key="(row: PracticeRecord) => row.id"
          :row-props="rowProps"
          :bordered="false"
          :single-line="false"
          size="medium"
        />
        <div v-if="filteredData.length > pageSize" class="pagination-wrap">
          <NPagination
            v-model:page="page"
            :page-size="pageSize"
            :item-count="filteredData.length"
            :page-slot="5"
          />
        </div>
      </template>
    </NSpin>

    <NDrawer v-model:show="showNotesDrawer" placement="right" width="360">
      <NDrawerContent v-if="selectedRecord" title="练习备注" closable>
        <div class="notes-meta">
          <NTag size="small" :bordered="false">{{ selectedRecord.section_name }}</NTag>
          <span>{{ formatDate(selectedRecord.practice_date) }}</span>
        </div>
        <div class="notes-stats">
          <span>题量 {{ selectedRecord.total_questions }}</span>
          <span>正确率 {{ formatPercent(selectedRecord.accuracy) }}</span>
          <span>平均 {{ formatNumber(selectedRecord.avg_time_per_question, 2) }} 分/题</span>
        </div>
        <div class="notes-body">
          {{ selectedRecord.notes || '暂无备注' }}
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

.trend-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.filter-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

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

.empty-wrap {
  padding: 60px 0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

:deep(.n-data-table-tr:hover) {
  background-color: var(--bg-hover) !important;
}
:deep(.clickable-row) {
  cursor: pointer;
}

.notes-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-size: 13px;
}

.notes-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.notes-body {
  white-space: pre-wrap;
  line-height: 1.7;
  color: var(--text-primary);
}
</style>
