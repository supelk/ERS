<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChart } from '@/composables/useCharts'
import { useAppStore } from '@/stores/app'

export interface OrderEfficiencyPoint {
  section_name: string
  label: string
  score_efficiency: number
  questions_per_minute: number
}

const props = defineProps<{
  data: OrderEfficiencyPoint[]
}>()

const appStore = useAppStore()

const getOption = computed(() => ({
  title: {
    text: '做题顺序效率变化',
    left: 'right',
    top: 8,
    textStyle: { fontSize: 14, fontWeight: 600, color: '#6B7280' },
  },
  tooltip: {
    trigger: 'axis' as const,
    formatter: ((params: any[]) => {
      if (!params || params.length === 0) return ''
      const idx = params[0].dataIndex
      const item = props.data[idx]
      if (!item) return ''
      return [
        `<b>${idx + 1}. ${item.label}</b>`,
        `得分效率：<b>${item.score_efficiency.toFixed(2)}</b> 分/分钟`,
        `答题速度：<b>${item.questions_per_minute.toFixed(2)}</b> 题/分钟`,
      ].join('<br/>')
    }) as any,
  },
  legend: {
    top: 34,
    data: ['得分效率', '单位时间答题数'],
    textStyle: { color: '#6B7280', fontSize: 11 },
  },
  grid: { left: '4%', right: '5%', bottom: '10%', top: '22%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: props.data.map((item, index) => `${index + 1}. ${item.label}`),
    axisLabel: {
      interval: 0,
      rotate: props.data.length > 5 ? 24 : 0,
      fontSize: 11,
      color: '#6B7280',
    },
    axisTick: { alignWithLabel: true },
  },
  yAxis: [
    {
      type: 'value' as const,
      name: '分/分钟',
      axisLabel: { fontSize: 11, color: '#9CA3AF' },
      splitLine: { lineStyle: { color: '#E5E7EB' } },
    },
    {
      type: 'value' as const,
      name: '题/分钟',
      axisLabel: { fontSize: 11, color: '#9CA3AF' },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: '得分效率',
      type: 'line' as const,
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { width: 3, color: '#5B8DEF' },
      itemStyle: { color: '#5B8DEF' },
      data: props.data.map((item) => Number(item.score_efficiency.toFixed(2))),
    },
    {
      name: '单位时间答题数',
      type: 'line' as const,
      yAxisIndex: 1,
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { width: 3, color: '#10B981' },
      itemStyle: { color: '#10B981' },
      data: props.data.map((item) => Number(item.questions_per_minute.toFixed(2))),
    },
  ],
}))

const { chartRef, updateChart } = useChart(
  () => getOption.value,
  computed(() => appStore.theme),
)

watch(() => props.data, () => updateChart(), { deep: true })
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 360px" />
</template>
