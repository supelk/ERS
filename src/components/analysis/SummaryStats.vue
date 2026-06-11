<script setup lang="ts">
import { NCard, NGrid, NGi, NStatistic, NText } from 'naive-ui'

interface StatItem {
  label: string
  value: string | number
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
}

defineProps<{
  stats: StatItem[]
}>()
</script>

<template>
  <NGrid :cols="Math.min(stats.length, 6)" :x-gap="16" responsive="screen">
    <NGi v-for="(stat, idx) in stats" :key="idx" :span="2">
      <NCard size="small" :bordered="true">
        <NStatistic :label="stat.label" :value="stat.value">
          <template v-if="stat.suffix" #suffix>
            <NText depth="3" style="font-size: 14px">{{ stat.suffix }}</NText>
          </template>
        </NStatistic>
      </NCard>
    </NGi>
  </NGrid>
</template>
