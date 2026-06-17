<script setup lang="ts">
import { h, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NDataTable,
  NButton,
  NSpace,
  NInput,
  NPopconfirm,
  NEmpty,
  NSpin,
  NModal,
  NText,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { useIdiomStore } from '@/stores/idiom'
import type { IdiomRecord } from '@/types/exam'
import { formatDate } from '@/utils/formatters'

const router = useRouter()
const message = useMessage()
const idiomStore = useIdiomStore()

const loading = ref(true)
const searchKeyword = ref('')

// 随机复习闪卡
const showFlashcard = ref(false)
const flashcardWord = ref('')
const flashcardDefinition = ref('')
const flashcardFlipped = ref(false)

const filteredData = computed(() => {
  if (!searchKeyword.value) return idiomStore.records
  const kw = searchKeyword.value.toLowerCase()
  return idiomStore.records.filter((r) => r.word.toLowerCase().includes(kw))
})

const columns: DataTableColumns<IdiomRecord> = [
  {
    title: '词语',
    key: 'word',
    width: 120,
    render(row) {
      return h('span', { style: { fontWeight: 700, fontSize: '15px' } }, row.word)
    },
  },
  {
    title: '释义',
    key: 'definition',
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)', fontSize: '13px' } }, row.definition)
    },
  },
  {
    title: '备注',
    key: 'notes',
    width: 120,
    render(row) {
      return row.notes
        ? h('span', { style: { fontSize: '13px' } }, row.notes)
        : h('span', { style: { color: 'var(--text-tertiary)' } }, '--')
    },
  },
  {
    title: '日期',
    key: 'created_at',
    width: 100,
    render(row) {
      return formatDate(row.created_at || '')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
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
              router.push(`/idioms/${row.id}`)
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
              router.push(`/idioms/new?edit=${row.id}`)
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
              default: () => '确认删除？',
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

onMounted(async () => {
  loading.value = true
  try {
    await idiomStore.fetchRecords()
  } catch (e) {
    message.error('加载失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

async function handleDelete(id: number) {
  try {
    await idiomStore.deleteRecord(id)
    await idiomStore.fetchRecords()
    message.success('已删除')
  } catch (e) {
    message.error('删除失败: ' + String(e))
  }
}

function goCreate() {
  router.push('/idioms/new')
}

async function handleRandomReview() {
  try {
    const rec = await idiomStore.getRandomRecord()
    if (!rec) {
      message.warning('还没有成语记录，请先添加')
      return
    }
    flashcardWord.value = rec.word
    flashcardDefinition.value = rec.definition
    flashcardFlipped.value = false
    showFlashcard.value = true
  } catch (e) {
    message.error('获取失败: ' + String(e))
  }
}
</script>

<template>
  <div>
    <div class="top-bar">
      <h2 class="page-title">成语积累</h2>
      <NSpace :size="10">
        <NButton size="medium" @click="handleRandomReview">🎲 随机复习</NButton>
        <NButton type="primary" size="medium" @click="goCreate">
          <span style="margin-right: 2px">+</span> 添加成语
        </NButton>
      </NSpace>
    </div>

    <div class="filter-bar">
      <NInput
        v-model:value="searchKeyword"
        placeholder="搜索成语..."
        clearable
        style="width: 260px"
      />
    </div>

    <NSpin :show="loading">
      <div v-if="filteredData.length === 0 && !loading" class="empty-wrap">
        <NEmpty description="还没有成语记录">
          <template #extra>
            <NButton type="primary" @click="goCreate">添加第一个成语</NButton>
          </template>
        </NEmpty>
      </div>
      <template v-else-if="filteredData.length > 0">
        <NDataTable
          :columns="columns"
          :data="filteredData"
          :row-key="(row: IdiomRecord) => row.id"
          :bordered="false"
          :single-line="false"
          size="medium"
        />
      </template>
    </NSpin>

    <!-- 随机复习闪卡 -->
    <NModal
      :show="showFlashcard"
      @update:show="(v: boolean) => showFlashcard = v"
      :mask-closable="true"
    >
      <div class="flashcard" @click="flashcardFlipped = !flashcardFlipped">
        <template v-if="!flashcardFlipped">
          <div class="flashcard-front">
            <NText depth="3" style="font-size: 13px; margin-bottom: 16px;">点击翻面查看释义</NText>
            <span class="flashcard-word">{{ flashcardWord }}</span>
          </div>
        </template>
        <template v-else>
          <div class="flashcard-back">
            <span class="flashcard-word-sm">{{ flashcardWord }}</span>
            <div class="flashcard-def">{{ flashcardDefinition }}</div>
          </div>
        </template>
      </div>
    </NModal>
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

.filter-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.empty-wrap {
  padding: 60px 0;
}

/* 闪卡 */
.flashcard {
  width: 380px;
  min-height: 260px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  transition: transform 0.2s;
  user-select: none;
}
.flashcard:hover {
  transform: scale(1.02);
}
.flashcard-front,
.flashcard-back {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.flashcard-word {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
  font-family: var(--font-display);
  letter-spacing: 4px;
}
.flashcard-word-sm {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  font-family: var(--font-display);
  margin-bottom: 16px;
}
.flashcard-def {
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-primary);
  white-space: pre-wrap;
}

:deep(.n-data-table-tr:hover) {
  background-color: var(--bg-hover) !important;
}
</style>
