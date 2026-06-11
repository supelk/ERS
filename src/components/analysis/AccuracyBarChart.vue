<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChart } from '@/composables/useCharts'
import { useAppStore } from '@/stores/app'
import type { SectionComparison } from '@/types/exam'

const props = defineProps<{
  data: SectionComparison[]
  title?: string
}>()

const appStore = useAppStore()

const getOption = computed(() => ({
  title: { text: props.title || '板块正确率对比', left: 'center', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'axis' as const, formatter: '{b}: {c}%' },
  grid: { left: '3%', right: '8%', bottom: '12%', top: '15%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: props.data.map((d) => d.section_name),
    axisLabel: { rotate: 30, fontSize: 11 },
  },
  yAxis: {
    type: 'value' as const,
    name: '正确率 (%)',
    max: 100,
  },
  series: [
    {
      name: '正确率',
      type: 'bar' as const,
      data: props.data.map((d) => ({
        value: parseFloat(d.actual.toFixed(1)),
        itemStyle: { color: d.isAboveTarget ? '#18a058' : '#d03050' },
      })),
      markLine: {
        silent: true,
        symbol: 'none',
        label: { formatter: '目标: {c}%' },
        data: props.data.map((d, i) => ({
          xAxis: i,
          yAxis: d.target > 0 ? d.target : null,
        })),
        lineStyle: { type: 'dashed' as const, color: '#f0a020' },
      },
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
  <div ref="chartRef" style="width: 100%; height: 380px" />
</template>
