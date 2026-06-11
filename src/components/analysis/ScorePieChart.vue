<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChart } from '@/composables/useCharts'
import { useAppStore } from '@/stores/app'
import type { TimeDistribution } from '@/types/exam'

const props = defineProps<{
  data: TimeDistribution[]
}>()

const appStore = useAppStore()

const getOption = computed(() => ({
  title: { text: '用时占比 vs 题量占比', left: 'center', textStyle: { fontSize: 14 } },
  legend: { bottom: 0, data: ['用时占比', '题量占比'] },
  tooltip: { trigger: 'item' as const, formatter: '{b}: {c}%' },
  series: [
    {
      name: '用时占比',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '50%'],
      label: { formatter: '{b}\n{c}%', fontSize: 11 },
      data: props.data.map((d) => ({ name: d.section_name, value: parseFloat(d.time_percent.toFixed(1)) })),
    } as any,
  ],
}))

const { chartRef, updateChart } = useChart(
  () => getOption.value,
  computed(() => appStore.theme)
)

watch(() => props.data, () => updateChart(), { deep: true })
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 360px" />
</template>
