<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NButton, NSpace, NSpin, NEmpty, useMessage } from 'naive-ui'
import { usePracticeStore } from '@/stores/practice'
import { formatDate, formatPercent, formatNumber } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const practiceStore = usePracticeStore()

const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    await practiceStore.fetchRecordById(id)
  } catch (e) {
    message.error('加载练习详情失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/practice')
}

function goEdit() {
  const id = route.params.id
  router.push(`/practice/new?edit=${id}`)
}
</script>

<template>
  <div>
    <NSpin :show="loading">
      <template v-if="!loading && !practiceStore.currentRecord">
        <NEmpty description="练习记录不存在" />
      </template>

      <template v-if="practiceStore.currentRecord">
        <div class="detail-header">
          <div>
            <h2 class="detail-title">{{ practiceStore.currentRecord.section_name }} · 专项练习</h2>
            <span class="detail-meta">
              {{ formatDate(practiceStore.currentRecord.practice_date) }}
            </span>
          </div>
          <NSpace :size="10">
            <NButton @click="goBack">返回列表</NButton>
            <NButton type="primary" @click="goEdit">编辑</NButton>
          </NSpace>
        </div>

        <NCard>
          <div class="detail-table">
            <div class="detail-row">
              <span class="detail-label">练习板块</span>
              <span class="detail-value">{{ practiceStore.currentRecord.section_name }}</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">练习日期</span>
              <span class="detail-value">{{ formatDate(practiceStore.currentRecord.practice_date) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">总题数</span>
              <span class="detail-value">{{ practiceStore.currentRecord.total_questions }}</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">正确题数</span>
              <span class="detail-value">{{ practiceStore.currentRecord.correct_questions }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">正确率</span>
              <span
                class="detail-value"
                :style="{
                  color: practiceStore.currentRecord.accuracy >= 80
                    ? 'var(--success)'
                    : practiceStore.currentRecord.accuracy >= 60
                      ? 'var(--warning)'
                      : 'var(--error)',
                  fontWeight: 700,
                }"
              >
                {{ formatPercent(practiceStore.currentRecord.accuracy) }}
              </span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">总用时</span>
              <span class="detail-value">{{ practiceStore.currentRecord.used_time }} 分钟</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">平均每题用时</span>
              <span class="detail-value">
                {{ formatNumber(practiceStore.currentRecord.avg_time_per_question, 2) }} 分/题
              </span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">练习备注</span>
              <span class="detail-value">
                {{ practiceStore.currentRecord.notes || '--' }}
              </span>
            </div>
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

.detail-table {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}
.detail-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--border-light);
  transition: background-color 0.1s;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-row.alt {
  background: var(--bg-page);
}
.detail-label {
  width: 160px;
  flex-shrink: 0;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 13px;
}
.detail-value {
  flex: 1;
  color: var(--text-primary);
}
</style>
