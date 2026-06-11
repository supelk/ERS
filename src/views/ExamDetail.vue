<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NGrid, NGi, NSpin, NEmpty, NDivider, NButton, NSpace, NDataTable, useMessage, type DataTableColumns } from 'naive-ui'
import { useExamStore } from '@/stores/exam'
import { useAnalysisStore } from '@/stores/analysis'
import SummaryStats from '@/components/analysis/SummaryStats.vue'
import ComparisonCard from '@/components/analysis/ComparisonCard.vue'
import ScorePieChart from '@/components/analysis/ScorePieChart.vue'
import AccuracyBarChart from '@/components/analysis/AccuracyBarChart.vue'
import type { ExamSectionRecord, SectionComparison, TimeDistribution } from '@/types/exam'
import { formatPercent, formatNumber, formatDate } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const examStore = useExamStore()
const analysisStore = useAnalysisStore()

const examId = Number(route.params.id)
const loading = ref(true)

// 汇总统计
const summary = ref<any>(null)
const comparisonData = ref<SectionComparison[]>([])
const timeDistData = ref<TimeDistribution[]>([])

onMounted(async () => {
  loading.value = true
  try {
    await examStore.fetchExamById(examId)
    if (examStore.currentExam) {
      summary.value = await analysisStore.getExamSummary(examId)
      comparisonData.value = await analysisStore.getSectionComparisons(examId)
      timeDistData.value = await analysisStore.getTimeDistribution(examId)
    }
  } catch (e) {
    message.error('加载考试详情失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

function goEdit() {
  router.push(`/exams/new?edit=${examId}`)
}

function goBack() {
  router.push('/exams')
}

// 板块明细表格列
const sectionColumns: DataTableColumns<ExamSectionRecord> = [
  { title: '板块', key: 'section_name', width: 100 },
  { title: '总题数', key: 'total_questions', width: 70, align: 'center' },
  { title: '答对数', key: 'correct_questions', width: 70, align: 'center' },
  {
    title: '正确率', key: 'accuracy', width: 80, align: 'center',
    render: (row) => formatPercent(row.accuracy),
  },
  {
    title: '得分效率', key: 'score_efficiency', width: 90, align: 'center',
    render: (row) => formatNumber(row.score_efficiency, 2),
  },
  { title: '用时(分)', key: 'used_time', width: 80, align: 'center' },
  { title: '未作答', key: 'unattempted_questions', width: 70, align: 'center' },
  {
    title: '目标正确率', key: 'next_target_accuracy', width: 100, align: 'center',
    render: (row) => row.next_target_accuracy != null ? formatPercent(row.next_target_accuracy) : '--',
  },
]
</script>

<template>
  <div>
    <NSpin :show="loading">
      <template v-if="!loading && !examStore.currentExam">
        <NEmpty description="考试记录不存在" />
      </template>

      <template v-if="examStore.currentExam">
        <!-- 顶栏操作 -->
        <div class="detail-header">
          <div>
            <h2 style="margin: 0">{{ examStore.currentExam.exam_name }}</h2>
            <span style="color: #999; font-size: 13px">
              {{ formatDate(examStore.currentExam.exam_date) }} ·
              {{ examStore.currentExam.exam_type_1 }} ·
              {{ examStore.currentExam.exam_type }}
            </span>
          </div>
          <NSpace>
            <NButton @click="goBack">返回列表</NButton>
            <NButton type="primary" @click="goEdit">编辑</NButton>
          </NSpace>
        </div>

        <!-- 汇总统计 -->
        <NDivider>📊 概览</NDivider>
        <SummaryStats
          v-if="summary"
          :stats="[
            { label: '本次总分', value: `${summary.total_score} / ${summary.full_score}` },
            { label: '总正确率', value: summary.overall_accuracy.toFixed(1), suffix: '%' },
            { label: '平均正确率', value: summary.avg_accuracy.toFixed(1), suffix: '%' },
            { label: '板块数', value: summary.section_count },
            { label: '总题数', value: summary.total_questions },
            { label: '总用时', value: summary.total_used_time, suffix: '分钟' },
          ]"
        />

        <!-- 板块对比卡片 -->
        <NDivider>🎯 板块目标对比</NDivider>
        <NGrid :cols="Math.min(comparisonData.length || 3, 5)" :x-gap="12" style="margin-bottom: 16px">
          <NGi v-for="item in comparisonData" :key="item.section_name" :span="2">
            <ComparisonCard :data="item" />
          </NGi>
        </NGrid>

        <!-- 图表 -->
        <NGrid :cols="2" :x-gap="16">
          <NGi>
            <NCard>
              <ScorePieChart v-if="timeDistData.length > 0" :data="timeDistData" />
            </NCard>
          </NGi>
          <NGi>
            <NCard>
              <AccuracyBarChart
                v-if="comparisonData.length > 0"
                :data="comparisonData"
                title="板块正确率"
              />
            </NCard>
          </NGi>
        </NGrid>

        <!-- 板块明细表 -->
        <NDivider>📋 板块明细</NDivider>
        <NDataTable
          :columns="sectionColumns"
          :data="examStore.currentSections"
          :row-key="(row: ExamSectionRecord) => row.section_id"
          :bordered="false"
          size="small"
          :pagination="false"
        />

        <!-- 问题汇总 -->
        <NDivider>🔍 问题汇总</NDivider>
        <NGrid :cols="2" :x-gap="16">
          <NGi v-for="section in examStore.currentSections" :key="section.section_id">
            <NCard size="small" :title="section.section_name">
              <div v-if="section.analysis">
                <span style="font-weight: 600; font-size: 13px">问题分析：</span>
                <p style="margin: 4px 0; color: #666">{{ section.analysis }}</p>
              </div>
              <div v-if="section.plan">
                <span style="font-weight: 600; font-size: 13px">下一步计划：</span>
                <p style="margin: 4px 0; color: #666">{{ section.plan }}</p>
              </div>
              <div v-if="!section.analysis && !section.plan" style="color: #ccc; font-size: 13px">
                暂无记录
              </div>
            </NCard>
          </NGi>
        </NGrid>
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}
</style>
