<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NTag, NText, NSpace, NProgress } from 'naive-ui'
import type { SectionComparison } from '@/types/exam'
import { formatPercent, formatDiff } from '@/utils/formatters'

const props = defineProps<{
  data: SectionComparison
}>()

const type = computed<'success' | 'error' | 'warning'>(() => {
  if (props.data.isAboveTarget) return 'success'
  if (props.data.target === 0) return 'warning'
  return 'error'
})

const diffLabel = computed(() => {
  if (props.data.target === 0) return '无目标'
  return formatDiff(props.data.diff) + '%'
})

const progressPercent = computed(() => {
  if (props.data.target === 0) return 0
  return Math.min(Math.round((props.data.actual / props.data.target) * 100), 200)
})
</script>

<template>
  <NCard size="small" :bordered="true">
    <div class="comparison-card">
      <div class="card-header">
        <NText strong>{{ data.section_name }}</NText>
        <NTag :type="type" size="small">{{ diffLabel }}</NTag>
      </div>
      <div class="card-body">
        <NSpace vertical :size="4" style="width: 100%">
          <div class="metric-row">
            <NText depth="3" style="font-size: 12px">当前</NText>
            <NText strong :type="type">{{ formatPercent(data.actual) }}</NText>
          </div>
          <div class="metric-row">
            <NText depth="3" style="font-size: 12px">目标</NText>
            <NText>{{ formatPercent(data.target) }}</NText>
          </div>
          <NProgress
            :percentage="progressPercent"
            :color="data.isAboveTarget ? '#18a058' : '#d03050'"
            :height="6"
            :border-radius="3"
            :show-indicator="false"
          />
        </NSpace>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.comparison-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
