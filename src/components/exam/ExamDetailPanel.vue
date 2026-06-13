<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NCard,
  NButton,
  NTag,
  NText,
  NProgress,
  NEmpty,
  NSpin,
  NSpace,
  useMessage,
} from 'naive-ui'
import { useExamStore } from '@/stores/exam'
import type { ExamRecord, ExamSectionRecord } from '@/types/exam'
import { formatDate, formatPercent } from '@/utils/formatters'

const props = defineProps<{
  exam: ExamRecord | null
}>()

const emit = defineEmits<{
  close: []
  viewDetail: [examId: number]
  edit: [examId: number]
}>()

const message = useMessage()
const examStore = useExamStore()

const loading = ref(false)
const sections = ref<ExamSectionRecord[]>([])

async function loadSections() {
  if (!props.exam) return
  loading.value = true
  try {
    await examStore.fetchExamById(props.exam.exam_id)
    sections.value = examStore.currentSections
  } catch (e) {
    message.error('加载详情失败: ' + String(e))
  } finally {
    loading.value = false
  }
}

watch(() => props.exam?.exam_id, () => {
  if (props.exam) {
    loadSections()
  } else {
    sections.value = []
  }
}, { immediate: true })

// 板块层级分组
const parentSections = computed(() =>
  sections.value.filter((s) => !s.parent_section_name)
)
function childrenOf(parentName: string): ExamSectionRecord[] {
  return sections.value.filter((s) => s.parent_section_name === parentName)
}

function scorePercent(exam: ExamRecord): number {
  if (!exam.full_score || exam.full_score === 0) return 0
  return Math.round((exam.total_score / exam.full_score) * 100)
}

function accuracyColor(acc: number): string {
  if (acc >= 80) return 'var(--success)'
  if (acc >= 60) return 'var(--warning)'
  return 'var(--error)'
}
</script>

<template>
  <NCard class="detail-panel" :bordered="true">
    <NSpin :show="loading">
      <!-- 面板标题 -->
      <div class="panel-header">
        <h3 class="panel-title">考试详情</h3>
        <NButton
          text
          style="font-size: 18px; color: var(--text-tertiary)"
          @click="emit('close')"
        >
          ✕
        </NButton>
      </div>

      <template v-if="exam">
        <!-- 基础信息 -->
        <div class="info-group">
          <div class="info-label">基础信息</div>
          <div class="info-item">
            <NText depth="3" class="item-label">考试名称</NText>
            <NText strong class="item-value">{{ exam.exam_name }}</NText>
          </div>
          <div class="info-item">
            <NText depth="3" class="item-label">日期</NText>
            <NText class="item-value">{{ formatDate(exam.exam_date) }}</NText>
          </div>
          <div class="info-item">
            <NText depth="3" class="item-label">分类 · 类型</NText>
            <NSpace :size="6">
              <NTag
                size="small"
                :style="{
                  backgroundColor: exam.exam_type_1 === '国考' ? 'var(--info-bg)' : 'var(--warning-bg)',
                  color: exam.exam_type_1 === '国考' ? 'var(--info)' : '#D97706',
                  border: 'none', borderRadius: '6px', fontWeight: 500,
                }"
              >
                {{ exam.exam_type_1 }}
              </NTag>
              <NTag
                size="small"
                :style="{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: 'none', borderRadius: '6px' }"
              >
                {{ exam.exam_type }}
              </NTag>
            </NSpace>
          </div>
          <div class="info-item">
            <NText depth="3" class="item-label">总用时</NText>
            <NText class="item-value">
              {{ exam.total_time != null ? `${exam.total_time} 分钟` : '未记录' }}
            </NText>
          </div>
        </div>

        <!-- 得分模块 -->
        <div class="info-group">
          <div class="info-label">得分</div>
          <div class="score-block">
            <div class="score-row">
              <span class="score-number">{{ exam.total_score }}</span>
              <span class="score-divider">/</span>
              <span class="score-full">{{ exam.full_score }}</span>
            </div>
            <NProgress
              type="line"
              :percentage="scorePercent(exam)"
              :height="14"
              :border-radius="7"
              :show-indicator="true"
              indicator-placement="inside"
              processing
            />
          </div>
          <div v-if="exam.next_target_score != null" class="target-row">
            <NText depth="3" style="font-size: 13px">
              下次目标：<b style="color: var(--primary)">{{ exam.next_target_score }} 分</b>
            </NText>
          </div>
        </div>

        <!-- 板块概览（层级结构） -->
        <div class="info-group">
          <div class="info-label">板块概览</div>
          <div v-if="parentSections.length > 0" class="section-list">
            <template v-for="parent in parentSections" :key="parent.section_id">
              <!-- 一级板块 -->
              <div class="section-item parent-item">
                <div class="section-name-row">
                  <span class="section-name">{{ parent.section_name }}</span>
                  <span class="section-accuracy" :style="{ color: accuracyColor(parent.accuracy) }">
                    {{ formatPercent(parent.accuracy) }}
                  </span>
                </div>
                <div class="section-sub">
                  {{ parent.correct_questions }}/{{ parent.total_questions }} 题 · {{ parent.used_time }}分钟
                </div>
              </div>
              <!-- 二级板块（缩进） -->
              <div
                v-for="child in childrenOf(parent.section_name)"
                :key="child.section_id"
                class="section-item child-item"
              >
                <div class="section-name-row">
                  <span class="section-name child-name">└ {{ child.section_name }}</span>
                  <span class="section-accuracy" :style="{ color: accuracyColor(child.accuracy) }">
                    {{ formatPercent(child.accuracy) }}
                  </span>
                </div>
                <div class="section-sub">
                  {{ child.correct_questions }}/{{ child.total_questions }} 题 · {{ child.used_time }}分钟
                </div>
              </div>
            </template>
          </div>
          <div v-else-if="!loading" class="section-empty">
            <NText depth="3">暂无板块数据</NText>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="info-group actions-group">
          <NButton
            block
            style="border-radius: 8px; font-weight: 500"
            @click="emit('viewDetail', exam.exam_id)"
          >
            查看完整详情
          </NButton>
          <NButton
            block
            type="primary"
            style="margin-top: 8px; border-radius: 8px; font-weight: 500"
            @click="emit('edit', exam.exam_id)"
          >
            编辑此次考试
          </NButton>
        </div>
      </template>

      <!-- 无选中考试 -->
      <template v-else>
        <div class="no-selection">
          <NEmpty description="点击左侧考试行查看详情" size="small" />
        </div>
      </template>
    </NSpin>
  </NCard>
</template>

<style scoped>
.detail-panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  background: var(--bg-surface);
}
.detail-panel :deep(.n-card__content) {
  padding: 20px;
}

/* 面板标题 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

/* 信息区块 */
.info-group {
  margin-bottom: 22px;
}
.info-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}
.info-item {
  margin-bottom: 10px;
}
.info-item:last-child {
  margin-bottom: 0;
}
.item-label {
  font-size: 12px;
  display: block;
  margin-bottom: 2px;
}
.item-value {
  font-size: 14px;
}

/* 得分模块 */
.score-block {
  margin-bottom: 4px;
}
.score-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}
.score-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}
.score-divider {
  font-size: 18px;
  color: var(--text-tertiary);
  margin: 0 6px;
}
.score-full {
  font-size: 18px;
  color: var(--text-secondary);
}
.target-row {
  margin-top: 8px;
}

/* 板块列表 */
.section-list {
  max-height: 240px;
  overflow-y: auto;
}
.section-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
}
.section-item:last-child {
  border-bottom: none;
}
.section-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.child-item {
  padding-left: 16px;
}
.child-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--primary);
}
.section-accuracy {
  font-size: 13px;
  font-weight: 700;
}
.section-sub {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.section-empty {
  text-align: center;
  padding: 16px 0;
}

/* 操作区 */
.actions-group {
  margin-bottom: 0;
}

/* 无选中 */
.no-selection {
  padding: 40px 0;
}
</style>
