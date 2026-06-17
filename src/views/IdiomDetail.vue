<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NButton, NSpace, NSpin, NEmpty, NSelect, NText, NPopconfirm, useMessage } from 'naive-ui'
import { useIdiomStore } from '@/stores/idiom'
import { compareSynonyms } from '@/utils/llm'
import { formatDate } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const idiomStore = useIdiomStore()

const loading = ref(true)
const comparing = ref(false)
const compareTargetId = ref<number | null>(null)
const compareResult = ref('')

// 可对比的其他成语选项
const compareOptions = computed(() =>
  idiomStore.records
    .filter((r) => r.id !== idiomStore.currentRecord?.id)
    .map((r) => ({ label: r.word, value: r.id }))
)

onMounted(async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    await idiomStore.fetchRecordById(id)
    await idiomStore.fetchRecords()
  } catch (e) {
    message.error('加载失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/idioms')
}

function goEdit() {
  router.push(`/idioms/new?edit=${route.params.id}`)
}

async function handleDelete() {
  if (!idiomStore.currentRecord) return
  try {
    await idiomStore.deleteRecord(idiomStore.currentRecord.id)
    message.success('已删除')
    router.push('/idioms')
  } catch (e) {
    message.error('删除失败: ' + String(e))
  }
}

async function handleCompare() {
  if (!compareTargetId.value || !idiomStore.currentRecord) return
  const target = idiomStore.records.find((r) => r.id === compareTargetId.value)
  if (!target) return

  comparing.value = true
  compareResult.value = ''
  try {
    compareResult.value = await compareSynonyms(
      idiomStore.currentRecord.word,
      target.word,
    )
  } catch (e) {
    message.error(String(e))
  } finally {
    comparing.value = false
  }
}
</script>

<template>
  <div>
    <NSpin :show="loading">
      <template v-if="!loading && !idiomStore.currentRecord">
        <NEmpty description="成语记录不存在" />
      </template>

      <template v-if="idiomStore.currentRecord">
        <div class="detail-header">
          <div>
            <h2 class="detail-title">{{ idiomStore.currentRecord.word }}</h2>
            <span class="detail-meta">{{ formatDate(idiomStore.currentRecord.created_at || '') }}</span>
          </div>
          <NSpace :size="10">
            <NButton @click="goBack">返回列表</NButton>
            <NButton type="primary" @click="goEdit">编辑</NButton>
            <NPopconfirm @positive-click="handleDelete">
              <template #trigger>
                <NButton type="error">删除</NButton>
              </template>
              确认删除「{{ idiomStore.currentRecord.word }}」？
            </NPopconfirm>
          </NSpace>
        </div>

        <NCard style="margin-bottom: 16px">
          <div class="detail-label">释义</div>
          <p class="detail-definition">{{ idiomStore.currentRecord.definition }}</p>
          <div v-if="idiomStore.currentRecord.notes" class="detail-notes">
            <div class="detail-label">备注</div>
            <NText depth="2">{{ idiomStore.currentRecord.notes }}</NText>
          </div>
        </NCard>

        <!-- 同义词辨析 -->
        <NCard title="同义词辨析" size="small" style="margin-bottom: 16px">
          <div style="display: flex; gap: 12px; align-items: center">
            <NText>与「</NText>
            <NSelect
              v-model:value="compareTargetId"
              :options="compareOptions"
              placeholder="选择另一个成语..."
              style="flex: 1"
              filterable
            />
            <NText>」对比</NText>
            <NButton type="primary" size="small" :loading="comparing" @click="handleCompare" :disabled="!compareTargetId">
              开始辨析
            </NButton>
          </div>
          <div v-if="compareResult" class="compare-result">
            <div class="compare-result-text">{{ compareResult }}</div>
          </div>
          <div v-else-if="!comparing && compareOptions.length === 0" style="padding: 16px 0; text-align: center">
            <NText depth="3">暂无其他成语可供对比，先去添加更多成语吧</NText>
          </div>
        </NCard>
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
.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.detail-definition {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.9;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.detail-notes {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.compare-result {
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--primary-light);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
}
.compare-result-text {
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--text-primary);
}
</style>
