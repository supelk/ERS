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
  NSelect,
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

// 随机复习
const showFlashcard = ref(false)
const reviewCount = ref(5)
const reviewCards = ref<IdiomRecord[]>([])
const flippedCards = ref<Set<number>>(new Set())

const reviewCountOptions = [5, 10, 15, 20].map((n) => ({ label: `每次 ${n} 个`, value: n }))

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

async function loadReviewCards() {
  try {
    const cards = await idiomStore.getRandomRecords(reviewCount.value)
    if (cards.length === 0) {
      message.warning('还没有成语记录，请先添加')
      return
    }
    reviewCards.value = cards
    flippedCards.value = new Set()
  } catch (e) {
    message.error('获取失败: ' + String(e))
  }
}

async function handleRandomReview() {
  showFlashcard.value = true
  await loadReviewCards()
}

async function nextGroup() {
  await loadReviewCards()
}

function toggleCard(cardId: number) {
  const s = new Set(flippedCards.value)
  if (s.has(cardId)) s.delete(cardId)
  else s.add(cardId)
  flippedCards.value = s
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

    <!-- 随机复习 -->
    <NModal
      :show="showFlashcard"
      @update:show="(v: boolean) => showFlashcard = v"
      :mask-closable="true"
      :style="{ maxWidth: '90vw' }"
    >
      <div class="review-panel">
        <div class="review-top">
          <h3 class="review-title">随机复习</h3>
          <NSpace :size="12">
            <NSelect v-model:value="reviewCount" :options="reviewCountOptions" size="small" style="width: 120px" />
            <NButton size="small" type="primary" @click="nextGroup">下一组</NButton>
            <NButton size="small" @click="showFlashcard = false">关闭</NButton>
          </NSpace>
        </div>

        <div v-if="reviewCards.length === 0" style="text-align: center; padding: 48px 0">
          <NEmpty description="还没有成语记录" size="small" />
        </div>

        <div v-else class="review-grid">
          <div
            v-for="card in reviewCards"
            :key="card.id"
            class="review-card"
            :class="{ flipped: flippedCards.has(card.id) }"
            @click="toggleCard(card.id)"
          >
            <div class="card-face card-front">
              <span class="card-word">{{ card.word }}</span>
              <span class="card-hint">点击翻面</span>
            </div>
            <div class="card-face card-back">
              <span class="card-word-sm">{{ card.word }}</span>
              <p class="card-def">{{ card.definition }}</p>
              <p v-if="card.notes" class="card-notes">{{ card.notes }}</p>
            </div>
          </div>
        </div>
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

/* 复习面板 */
.review-panel {
  width: 720px;
  max-width: 90vw;
  background: var(--bg-page);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
}
.review-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.review-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 65vh;
  overflow-y: auto;
  padding: 2px;
}

/* 闪卡 */
.review-card {
  min-height: 160px;
  perspective: 600px;
  cursor: pointer;
  user-select: none;
}
.card-face {
  width: 100%;
  min-height: 160px;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.card-face:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

.card-front {
  display: flex;
}
.card-back {
  display: none;
}

.review-card.flipped .card-front { display: none; }
.review-card.flipped .card-back  { display: flex; }

.card-word {
  font-size: 26px;
  font-weight: 700;
  color: var(--primary);
  font-family: var(--font-display);
  letter-spacing: 3px;
}
.card-hint {
  margin-top: 10px;
  font-size: 11px;
  color: var(--text-tertiary);
}
.card-word-sm {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
  font-family: var(--font-display);
  margin-bottom: 8px;
}
.card-def {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.card-notes {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

:deep(.n-data-table-tr:hover) {
  background-color: var(--bg-hover) !important;
}
</style>
