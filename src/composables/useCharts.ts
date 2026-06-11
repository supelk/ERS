import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

// 注册必要的组件
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent,
  CanvasRenderer,
])

type Theme = 'light' | 'dark'

/**
 * ECharts 使用 composable
 * 自动处理 init / resize / dispose 生命周期
 */
export function useChart(
  getOption: () => EChartsOption,
  theme?: Ref<Theme>
) {
  const chartRef = ref<HTMLDivElement>()
  let chart: echarts.ECharts | null = null
  let resizeObserver: ResizeObserver | null = null

  function initChart() {
    if (!chartRef.value) return
    const t = theme?.value === 'dark' ? 'dark' : undefined
    chart = echarts.init(chartRef.value, t)
    chart.setOption(getOption())
  }

  function updateChart() {
    if (!chart) return
    chart.setOption(getOption(), { notMerge: true })
  }

  // 监听主题变化
  if (theme) {
    watch(theme, () => {
      chart?.dispose()
      initChart()
    })
  }

  onMounted(() => {
    initChart()
    resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    if (chartRef.value) {
      resizeObserver.observe(chartRef.value)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    chart?.dispose()
  })

  return { chartRef, updateChart }
}
