<script setup lang="ts">
import { NText, NTag } from 'naive-ui'
import TaskCard from './TaskCard.vue'
import type { PracticeTask } from '@/types/exam'

defineProps<{
  title: string
  tasks: PracticeTask[]
  color: string
}>()

const emit = defineEmits<{
  edit: [task: PracticeTask]
  delete: [task: PracticeTask]
  complete: [task: PracticeTask]
}>()
</script>

<template>
  <div class="task-column">
    <div class="column-header">
      <NText strong>{{ title }}</NText>
      <NTag :color="{ color, textColor: '#fff' }" size="small">{{ tasks.length }}</NTag>
    </div>
    <div class="column-body">
      <TaskCard
        v-for="task in tasks"
        :key="task.task_id"
        :task="task"
        @edit="emit('edit', task)"
        @delete="emit('delete', task)"
        @complete="emit('complete', task)"
      />
      <div v-if="tasks.length === 0" class="column-empty">
        <NText depth="3" style="font-size: 12px">暂无</NText>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-column {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  background: var(--card-color, #fafafa);
  border-radius: 8px;
  padding: 8px;
}
.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}
.column-body {
  flex: 1;
  overflow-y: auto;
}
.column-empty {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}
</style>
