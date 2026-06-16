<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NTag, NText, NProgress, NButton, NSpace } from 'naive-ui'
import { usePracticeStore } from '@/stores/practice'
import type { PracticeTask, PracticeRecord } from '@/types/exam'
import { TASK_STATUS_COLORS } from '@/utils/constants'
import { formatDate, formatPercent } from '@/utils/formatters'

const props = defineProps<{
  task: PracticeTask
  sectionLabel?: string
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  advance: []
}>()

const router = useRouter()
const practiceStore = usePracticeStore()

const progressPercent = computed(() => {
  if (!props.task.total_questions) return 0
  return Math.round((props.task.completed_questions / props.task.total_questions) * 100)
})

const isExpired = computed(() => {
  if (!props.task.deadline || props.task.status === '已完成') return false
  return new Date(props.task.deadline) < new Date()
})

// 关联专项练习
const expanded = ref(false)
const linkedRecords = ref<PracticeRecord[]>([])
const loadingLinks = ref(false)

async function toggleExpanded() {
  expanded.value = !expanded.value
  if (expanded.value && linkedRecords.value.length === 0) {
    loadingLinks.value = true
    try {
      linkedRecords.value = await practiceStore.getRecordsByTaskId(props.task.task_id)
    } catch {
      // ignore
    } finally {
      loadingLinks.value = false
    }
  }
}
</script>

<template>
  <NCard size="small" :bordered="true" class="task-card">
    <!-- 标题行 -->
    <div class="task-header">
      <NText strong class="task-name">{{ task.task_name }}</NText>
      <NTag
        :color="{ color: TASK_STATUS_COLORS[task.status], textColor: '#fff' }"
        size="small"
        :bordered="false"
      >
        {{ task.status }}
      </NTag>
    </div>

    <!-- 进度 -->
    <div class="task-progress">
      <NProgress
        :percentage="progressPercent"
        :color="task.status === '已完成' ? 'var(--success)' : 'var(--primary)'"
        :height="6"
        :border-radius="3"
        :show-indicator="false"
        processing
      />
      <NText depth="3" class="progress-text">
        {{ task.completed_questions }} / {{ task.total_questions }} 题（{{ progressPercent }}%）
      </NText>
    </div>

    <!-- 关联板块 -->
    <div v-if="sectionLabel" class="task-section">
      <NText depth="3" style="font-size: 12px">关联：{{ sectionLabel }}</NText>
    </div>

    <!-- 截止时间 -->
    <div v-if="task.deadline" class="task-deadline">
      <NText :type="isExpired && task.status !== '已完成' ? 'error' : 'default'" style="font-size: 12px">
        截止：{{ task.deadline }}
      </NText>
    </div>

    <!-- 操作 -->
    <div class="task-actions">
      <NSpace :size="4">
        <NButton size="tiny" quaternary type="primary" @click="emit('advance')">
          ▸
        </NButton>
        <NButton size="tiny" quaternary type="primary" @click="emit('edit')">
          编辑
        </NButton>
        <NButton size="tiny" quaternary type="error" @click="emit('delete')">
          删除
        </NButton>
        <NButton size="tiny" quaternary @click="toggleExpanded">
          {{ expanded ? '收起练习' : '关联练习' }}
        </NButton>
      </NSpace>
    </div>

    <!-- 关联专项练习列表 -->
    <div v-if="expanded" class="linked-practices">
      <div v-if="loadingLinks" class="linked-loading">
        <NText depth="3" style="font-size: 12px">加载中...</NText>
      </div>
      <div v-else-if="linkedRecords.length === 0" class="linked-empty">
        <NText depth="3" style="font-size: 12px">暂无关联专项练习</NText>
      </div>
      <div v-else class="linked-list">
        <div
          v-for="rec in linkedRecords"
          :key="rec.id"
          class="linked-item"
          @click="router.push(`/practice/${rec.id}`)"
        >
          <span class="linked-date">{{ formatDate(rec.practice_date) }}</span>
          <NTag size="tiny" :style="{ backgroundColor: 'var(--info-bg)', color: 'var(--info)', border: 'none', borderRadius: '4px' }">
            {{ rec.section_name }}
          </NTag>
          <span class="linked-stats">
            {{ rec.correct_questions }}/{{ rec.total_questions }}
            <span :style="{ color: rec.accuracy >= 80 ? 'var(--success)' : rec.accuracy >= 60 ? 'var(--warning)' : 'var(--error)', fontWeight: 600 }">
              {{ formatPercent(rec.accuracy) }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.task-card {
  margin-bottom: 8px;
  cursor: default;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  transition: box-shadow 0.15s;
}
.task-card:hover {
  box-shadow: var(--shadow-md);
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 8px;
}
.task-name {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}
.task-progress {
  margin-bottom: 6px;
}
.progress-text {
  font-size: 11px;
  margin-top: 2px;
}
.task-section {
  margin-bottom: 2px;
}
.task-deadline {
  margin-bottom: 4px;
}
.task-actions {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--border-light);
}

/* 关联练习 */
.linked-practices {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}
.linked-loading,
.linked-empty {
  padding: 8px 0;
  text-align: center;
}
.linked-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
}
.linked-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.1s;
  font-size: 12px;
}
.linked-item:hover {
  background-color: var(--bg-hover);
}
.linked-date {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.linked-stats {
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: auto;
}
</style>
