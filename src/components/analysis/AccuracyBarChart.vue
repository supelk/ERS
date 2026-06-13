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
  title: {
    text: props.title || '板块正确率',
    left: 'right',
    top: 8,
    textStyle: { fontSize: 14, fontWeight: 600, color: '#6B7280' },
  },
  tooltip: {
    trigger: 'axis' as const,
    formatter: ((params: any) => {
      if (!params || params.length === 0) return ''
      const item = params[0]
      const idx = item.dataIndex
      const d = props.data[idx]
      if (!d) return item.value + '%'
      let html = `<b>${item.name}</b><br/>`
      html += `正确率：<b>${d.actual.toFixed(1)}%</b><br/>`
      if (d.target > 0) {
        const color = d.actual >= d.target ? '#10B981' : '#DC2626'
        html += `目标正确率：<b style="color:${color}">${d.target.toFixed(1)}%</b>`
      }
      return html
    }) as any,
  },
  grid: { left: '3%', right: '5%', bottom: '8%', top: '10%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: props.data.map((d) => d.section_name),
    axisLabel: { rotate: 0, fontSize: 11, color: '#6B7280' },
    axisTick: { alignWithLabel: true },
  },
  yAxis: {
    type: 'value' as const,
    name: '%',
    max: 100,
    axisLabel: { fontSize: 11, color: '#9CA3AF' },
  },
  series: [
    {
      name: '正确率',
      type: 'bar' as const,
      barWidth: '50%',
      data: props.data.map((d) => ({
        value: parseFloat(d.actual.toFixed(1)),
        itemStyle: {
          color: d.isAboveTarget ? '#10B981' : '#DC2626',
          borderRadius: [4, 4, 0, 0],
        },
      })),
      label: {
        show: true,
        position: 'top' as const,
        fontSize: 10,
        color: '#6B7280',
        formatter: '{c}%',
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
