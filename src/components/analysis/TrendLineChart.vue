<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChart } from '@/composables/useCharts'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  title: string
  xLabels: string[]
  series: { name: string; data: number[] }[]
  yAxisName?: string
}>()

const appStore = useAppStore()

const getOption = computed(() => ({
  title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'axis' as const },
  legend: { bottom: 0, data: props.series.map((s) => s.name) },
  grid: { left: '3%', right: '4%', bottom: '14%', top: '15%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: props.xLabels,
    boundaryGap: false,
  },
  yAxis: {
    type: 'value' as const,
    name: props.yAxisName || '',
    min: 0,
    max: 100,
  },
  series: props.series.map((s) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
  } as any)),
}))

const { chartRef, updateChart } = useChart(
  () => getOption.value,
  computed(() => appStore.theme)
)

watch(
  () => [props.xLabels, props.series],
  () => updateChart(),
  { deep: true }
)
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 380px" />
</template>
