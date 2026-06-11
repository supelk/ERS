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
  NCard,
  NEmpty,
  NSpin,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import ImportDialog from '@/components/common/ImportDialog.vue'
import ExportDialog from '@/components/common/ExportDialog.vue'
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

// 表格列定义
const columns: DataTableColumns<ExamRecord> = [
  {
    title: '考试名称',
    key: 'exam_name',
    width: 260,
    ellipsis: { tooltip: true },
  },
  {
    title: '日期',
    key: 'exam_date',
    width: 120,
    render(row) {
      return formatDate(row.exam_date)
    },
  },
  {
    title: '分类',
    key: 'exam_type_1',
    width: 70,
    render(row) {
      return h(NTag, { size: 'small', type: row.exam_type_1 === '国考' ? 'info' : 'warning' }, { default: () => row.exam_type_1 })
    },
  },
  {
    title: '类型',
    key: 'exam_type',
    width: 90,
    render(row) {
      const typeMap: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
        '模考': 'default',
        '真题': 'success',
        '专项练习': 'info',
        '自测': 'warning',
      }
      return h(NTag, { size: 'small', type: typeMap[row.exam_type] || 'default' }, { default: () => row.exam_type })
    },
  },
  {
    title: '总分',
    key: 'total_score',
    width: 80,
    render(row) {
      return `${row.total_score} / ${row.full_score}`
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
    width: 90,
    render(row) {
      return row.total_time != null ? `${row.total_time} 分钟` : '--'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render(row) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: () => goDetail(row.exam_id),
          }, { default: () => '查看' }),
          h(NButton, {
            size: 'small',
            quaternary: true,
            type: 'info',
            onClick: () => goEdit(row.exam_id),
          }, { default: () => '编辑' }),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row.exam_id),
            },
            {
              default: () => '确认删除此考试记录？',
              trigger: () =>
                h(NButton, {
                  size: 'small',
                  quaternary: true,
                  type: 'error',
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
    message.success('已删除')
  } catch (e) {
    message.error('删除失败: ' + String(e))
  }
}
</script>

<template>
  <div>
    <div class="list-header">
      <h2 style="margin: 0">考试记录</h2>
      <NButton type="primary" size="large" @click="goCreate">
        + 录入新考试
      </NButton>
      <NSpace>
        <NButton @click="showImport = true">📥 导入</NButton>
        <NButton @click="showExport = true">📤 导出</NButton>
      </NSpace>
    </div>

    <!-- 筛选栏 -->
    <NCard size="small" style="margin-bottom: 16px">
      <NSpace align="center">
        <NInput
          v-model:value="searchKeyword"
          placeholder="搜索考试名称..."
          clearable
          style="width: 260px"
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
        <NText depth="3">共 {{ filteredData.length }} 条记录</NText>
      </NSpace>
    </NCard>

    <!-- 数据表格 -->
    <NSpin :show="examStore.loading">
      <div v-if="filteredData.length === 0 && !examStore.loading">
        <NEmpty description="暂无考试记录">
          <template #extra>
            <NButton @click="goCreate">录入第一次考试</NButton>
          </template>
        </NEmpty>
      </div>
      <NDataTable
        v-else
        :columns="columns"
        :data="filteredData"
        :row-key="(row: ExamRecord) => row.exam_id"
        :pagination="{ pageSize: 20 }"
        :bordered="false"
        :single-line="false"
        size="small"
      />
    </NSpin>

    <ImportDialog v-model:show="showImport" />
    <ExportDialog v-model:show="showExport" />
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
