<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChart } from '@/composables/useCharts'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  title: string
  xLabels: string[]
  series: { name: string; data: number[] }[]
  yAxisName?: string
  /** Y 轴最大值，不传则自动计算 */
  yMax?: number
  /** Y 轴最小值，默认 0 */
  yMin?: number
}>()

const appStore = useAppStore()

const getOption = computed(() => ({
  title: { text: props.title, left: 'right', top: 8, textStyle: { fontSize: 14, fontWeight: 600, color: '#6B7280' } },
  tooltip: { trigger: 'axis' as const },
  legend: { bottom: 0, data: props.series.map((s) => s.name) },
  grid: { left: '3%', right: '5%', bottom: '14%', top: '10%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: props.xLabels,
    boundaryGap: false,
    axisLabel: { rotate: 0, fontSize: 11, color: '#6B7280' },
  },
  yAxis: {
    type: 'value' as const,
    name: props.yAxisName || '',
    ...(props.yMin != null ? { min: props.yMin } : { min: 0 }),
    ...(props.yMax != null ? { max: props.yMax } : {}),
    axisLabel: { fontSize: 11, color: '#9CA3AF' },
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
