<script setup lang="ts">
import { NCard, NTag, NText, NButton, NSpace } from 'naive-ui'
import type { PracticeTask } from '@/types/exam'
import { TASK_STATUS_COLORS } from '@/utils/constants'

defineProps<{
  task: PracticeTask
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  complete: []
}>()
</script>

<template>
  <NCard size="small" :bordered="true" class="task-card">
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

    <div class="task-actions">
      <NSpace :size="4">
        <NButton
          v-if="task.status !== '已完成'"
          size="tiny"
          quaternary
          type="success"
          @click="emit('complete')"
        >
          完成
        </NButton>
        <NButton size="tiny" quaternary type="primary" @click="emit('edit')">
          编辑
        </NButton>
        <NButton size="tiny" quaternary type="error" @click="emit('delete')">
          删除
        </NButton>
      </NSpace>
    </div>
  </NCard>
</template>

<style scoped>
.task-card {
  margin-bottom: 8px;
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
.task-actions {
  padding-top: 6px;
  border-top: 1px solid var(--border-light);
}
</style>
