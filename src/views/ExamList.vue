<script setup lang="ts">
import { h, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NDataTable,
  NButton,
  NSpace,
  NInput,
  NSelect,
  NTag,
  NText,
  NPopconfirm,
  NEmpty,
  NSpin,
  NPagination,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import ImportDialog from '@/components/common/ImportDialog.vue'
import ExportDialog from '@/components/common/ExportDialog.vue'
import ExamDetailPanel from '@/components/exam/ExamDetailPanel.vue'
import { useExamStore } from '@/stores/exam'
import type { ExamRecord, ExamType, ExamType1 } from '@/types/exam'
import { formatDate } from '@/utils/formatters'
import {
  EXAM_TYPE_1_OPTIONS,
  EXAM_TYPE_OPTIONS,
} from '@/utils/constants'

const router = useRouter()
const message = useMessage()
const examStore = useExamStore()

const searchKeyword = ref('')
const filterType1 = ref<ExamType1 | ''>('')
const filterType = ref<ExamType | ''>('')
const showImport = ref(false)
const showExport = ref(false)
const selectedExamId = ref<number | null>(null)
const page = ref(1)
const pageSize = 20

// 初始化加载
onMounted(async () => {
  try {
    await examStore.fetchExams()
  } catch (e) {
    message.error('加载考试列表失败: ' + String(e))
  }
})

// 筛选后的数据
const filteredData = computed(() => {
  let list = examStore.exams
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter((e) => e.exam_name.toLowerCase().includes(kw))
  }
  if (filterType1.value) {
    list = list.filter((e) => e.exam_type_1 === filterType1.value)
  }
  if (filterType.value) {
    list = list.filter((e) => e.exam_type === filterType.value)
  }
  return list
})

// 分页后的数据
const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

// 选中的考试
const selectedExam = computed(() => {
  if (selectedExamId.value == null) return null
  return examStore.exams.find((e) => e.exam_id === selectedExamId.value) || null
})

// 表格列定义
const columns: DataTableColumns<ExamRecord> = [
  {
    title: '考试名称',
    key: 'exam_name',
    width: 220,
    ellipsis: { tooltip: true },
  },
  {
    title: '日期',
    key: 'exam_date',
    width: 110,
    render(row) {
      return formatDate(row.exam_date)
    },
  },
  {
    title: '分类',
    key: 'exam_type_1',
    width: 70,
    render(row) {
      const isNational = row.exam_type_1 === '国考'
      return h(NTag, {
        size: 'small',
        style: {
          backgroundColor: isNational ? 'var(--info-bg)' : 'var(--warning-bg)',
          color: isNational ? 'var(--info)' : '#D97706',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 500,
        },
      }, { default: () => row.exam_type_1 })
    },
  },
  {
    title: '类型',
    key: 'exam_type',
    width: 90,
    render(row) {
      const typeStyle: Record<string, { bg: string; color: string }> = {
        '模考': { bg: 'var(--bg-page)', color: 'var(--text-secondary)' },
        '真题': { bg: 'var(--success-bg)', color: 'var(--success)' },
        '专项练习': { bg: 'var(--info-bg)', color: 'var(--info)' },
        '自测': { bg: 'var(--warning-bg)', color: '#D97706' },
      }
      const s = typeStyle[row.exam_type] || { bg: 'var(--bg-page)', color: 'var(--text-secondary)' }
      return h(NTag, {
        size: 'small',
        style: {
          backgroundColor: s.bg,
          color: s.color,
          border: 'none',
          borderRadius: '6px',
          fontWeight: 500,
        },
      }, { default: () => row.exam_type })
    },
  },
  {
    title: '总分',
    key: 'total_score',
    width: 90,
    render(row) {
      return h('span', { style: { fontWeight: 600 } }, `${row.total_score} / ${row.full_score}`)
    },
  },
  {
    title: '目标分',
    key: 'next_target_score',
    width: 80,
    render(row) {
      return row.next_target_score != null ? String(row.next_target_score) : '--'
    },
  },
  {
    title: '总用时',
    key: 'total_time',
    width: 80,
    render(row) {
      return row.total_time != null ? `${row.total_time} 分钟` : '--'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render(row) {
      return h(NSpace, { size: 8 }, {
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
              goDetail(row.exam_id)
            },
          }, { default: () => '查看' }),
          h(
            NPopconfirm,
            {
              onPositiveClick: (e: Event) => {
                e?.stopPropagation()
                handleDelete(row.exam_id)
              },
            },
            {
              default: () => '确认删除此考试记录？',
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

function goDetail(examId: number) {
  router.push(`/exams/${examId}`)
}

function goEdit(examId: number) {
  router.push(`/exams/new?edit=${examId}`)
}

function goCreate() {
  router.push('/exams/new')
}

async function handleDelete(examId: number) {
  try {
    await examStore.deleteExam(examId)
    if (selectedExamId.value === examId) {
      selectedExamId.value = null
    }
    message.success('已删除')
  } catch (e) {
    message.error('删除失败: ' + String(e))
  }
}

function handleRowClick(row: ExamRecord) {
  selectedExamId.value = selectedExamId.value === row.exam_id ? null : row.exam_id
}

function handleClosePanel() {
  selectedExamId.value = null
}
</script>

<template>
  <div class="exam-list-page">
    <!-- 左栏：主内容 -->
    <div class="main-column" :class="{ 'with-panel': selectedExamId != null }">
      <!-- 顶部操作栏 -->
      <div class="top-bar">
        <h2 class="page-title">考试记录</h2>
        <NSpace :size="10">
          <NButton type="primary" size="medium" @click="goCreate">
            <span style="margin-right: 2px">+</span> 录入新考试
          </NButton>
          <NButton size="medium" @click="showImport = true">导入</NButton>
          <NButton size="medium" @click="showExport = true">导出</NButton>
        </NSpace>
      </div>

      <!-- 筛选搜索区 -->
      <div class="filter-bar">
        <div class="filter-left">
          <NInput
            v-model:value="searchKeyword"
            placeholder="搜索考试名称..."
            clearable
            style="width: 240px"
          />
          <NSelect
            v-model:value="filterType1"
            :options="[{ label: '全部分类', value: '' }, ...EXAM_TYPE_1_OPTIONS]"
            style="width: 120px"
          />
          <NSelect
            v-model:value="filterType"
            :options="[{ label: '全部类型', value: '' }, ...EXAM_TYPE_OPTIONS]"
            style="width: 130px"
          />
        </div>
        <NText depth="3" class="record-count">
          共 {{ filteredData.length }} 条记录
        </NText>
      </div>

      <!-- 数据表格 -->
      <NSpin :show="examStore.loading">
        <div v-if="filteredData.length === 0 && !examStore.loading" class="empty-wrap">
          <NEmpty description="暂无考试记录">
            <template #extra>
              <NButton type="primary" @click="goCreate">录入第一次考试</NButton>
            </template>
          </NEmpty>
        </div>
        <template v-else>
          <NDataTable
            :columns="columns"
            :data="pagedData"
            :row-key="(row: ExamRecord) => row.exam_id"
            :bordered="false"
            :single-line="false"
            size="medium"
            :row-props="(row: ExamRecord) => ({
              style: {
                cursor: 'pointer',
                backgroundColor: selectedExamId === row.exam_id ? 'var(--primary-light)' : 'transparent',
                transition: 'background-color 0.15s',
              },
              onClick: () => handleRowClick(row),
            })"
          />
          <!-- 分页 -->
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
    </div>

    <!-- 右栏：考试详情面板 -->
    <transition name="panel-slide">
      <div v-if="selectedExamId != null" class="detail-column">
        <ExamDetailPanel
          :exam="selectedExam"
          @close="handleClosePanel"
          @view-detail="goDetail"
          @edit="goEdit"
        />
      </div>
    </transition>

    <ImportDialog v-model:show="showImport" />
    <ExportDialog v-model:show="showExport" />
  </div>
</template>

<style scoped>
.exam-list-page {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* 左栏 */
.main-column {
  flex: 1;
  min-width: 0;
  transition: all 0.3s ease;
}

/* 顶部操作栏 */
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
  letter-spacing: 0.5px;
}

/* 筛选搜索区 */
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
.record-count {
  font-size: 13px;
  flex-shrink: 0;
}

/* 空状态 */
.empty-wrap {
  padding: 60px 0;
}

/* 表格行 hover */
:deep(.n-data-table-tr:hover) {
  background-color: var(--bg-hover) !important;
}

/* 分页 */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 右栏 */
.detail-column {
  width: 340px;
  flex-shrink: 0;
  position: sticky;
  top: 24px;
}

/* 面板滑入过渡 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.25s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
