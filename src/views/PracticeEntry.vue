<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NCard,
  NButton,
  NSpace,
  NInput,
  NSelect,
  NInputNumber,
  NDatePicker,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'
import { usePracticeStore } from '@/stores/practice'
import { useDatabaseStore } from '@/stores/database'
import type { PracticeFormData } from '@/types/exam'
import { todayStr, formatPercent } from '@/utils/formatters'
import { ALL_SECTIONS } from '@/utils/constants'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const practiceStore = usePracticeStore()
const dbStore = useDatabaseStore()

const isEdit = ref(false)
const saving = ref(false)
const loading = ref(false)

const formData = ref<PracticeFormData>({
  id: 0,
  section_name: '',
  practice_date: todayStr(),
  total_questions: 0,
  correct_questions: 0,
  used_time: 0,
  notes: null,
})

const previewAccuracy = computed(() => {
  if (!formData.value.total_questions || formData.value.total_questions <= 0) return 0
  return (formData.value.correct_questions / formData.value.total_questions) * 100
})

const accuracyColor = computed(() => {
  if (previewAccuracy.value >= 80) return 'var(--success)'
  if (previewAccuracy.value >= 60) return 'var(--warning)'
  return 'var(--error)'
})

onMounted(async () => {
  loading.value = true
  try {
    const editId = route.query.edit ? Number(route.query.edit) : null
    if (editId && editId > 0) {
      isEdit.value = true
      await practiceStore.fetchRecordById(editId)
      if (practiceStore.currentRecord) {
        const r = practiceStore.currentRecord
        formData.value = {
          id: r.id,
          section_name: r.section_name,
          practice_date: r.practice_date,
          total_questions: r.total_questions,
          correct_questions: r.correct_questions,
          used_time: r.used_time,
          notes: r.notes,
        }
      }
    }
  } catch (e) {
    message.error('加载数据失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  if (!dbStore.isReady) {
    message.error('数据库未就绪，请重启应用')
    return
  }

  const fd = formData.value
  if (!fd.section_name) {
    message.warning('请选择练习板块')
    return
  }
  if (!fd.practice_date) {
    message.warning('请选择练习日期')
    return
  }
  if (fd.total_questions <= 0) {
    message.warning('总题数必须大于 0')
    return
  }
  if (fd.correct_questions > fd.total_questions) {
    message.warning('正确题数不能超过总题数')
    return
  }
  if (fd.used_time <= 0) {
    message.warning('请填写总用时')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await practiceStore.updateRecord(fd)
      message.success('练习记录已更新')
    } else {
      await practiceStore.createRecord(fd)
      message.success('练习记录已保存')
    }
    router.push('/practice')
  } catch (e) {
    message.error('保存失败: ' + String(e))
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  router.push('/practice')
}
</script>

<template>
  <div>
    <NSpin :show="loading">
      <div class="entry-header">
        <h2 class="entry-title">{{ isEdit ? '编辑专项练习' : '录入专项练习' }}</h2>
        <NSpace :size="10">
          <NButton size="medium" @click="handleCancel">取消</NButton>
          <NButton type="primary" size="medium" :loading="saving" @click="handleSave">
            {{ isEdit ? '更新' : '保存' }}
          </NButton>
        </NSpace>
      </div>

      <NCard style="margin-bottom: 16px">
        <div class="form-body">
          <div class="form-row">
            <div class="form-col">
              <label class="form-label">练习板块 *</label>
              <NSelect
                v-model:value="formData.section_name"
                :options="ALL_SECTIONS"
                placeholder="选择练习板块"
              />
            </div>
            <div class="form-col">
              <label class="form-label">练习日期 *</label>
              <NDatePicker
                :value="formData.practice_date ? new Date(formData.practice_date).getTime() : null"
                @update:value="(v: number | null) => {
                  const d = v ? new Date(v) : new Date()
                  formData.practice_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                }"
                type="date"
                style="width: 100%"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-col">
              <label class="form-label">总题数 *</label>
              <NInputNumber
                v-model:value="formData.total_questions"
                :min="0"
                placeholder="0"
                style="width: 100%"
              />
            </div>
            <div class="form-col">
              <label class="form-label">正确题数 *</label>
              <NInputNumber
                v-model:value="formData.correct_questions"
                :min="0"
                :max="formData.total_questions"
                placeholder="0"
                style="width: 100%"
              />
            </div>
            <div class="form-col">
              <label class="form-label">正确率</label>
              <NText
                :style="{ fontWeight: 700, fontSize: '16px', color: accuracyColor, lineHeight: '34px', display: 'inline-block' }"
              >
                {{ formatPercent(previewAccuracy) }}
              </NText>
            </div>
          </div>

          <div class="form-row">
            <div class="form-col">
              <label class="form-label">总用时（分钟）*</label>
              <NInputNumber
                v-model:value="formData.used_time"
                :min="0"
                placeholder="分钟"
                style="width: 100%"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-col-full">
              <label class="form-label">练习备注</label>
              <NInput
                v-model:value="formData.notes"
                type="textarea"
                placeholder="记录刷题感受、问题总结..."
                :autosize="{ minRows: 2, maxRows: 4 }"
              />
            </div>
          </div>
        </div>
      </NCard>

      <!-- 底部保存 -->
      <div style="text-align: center">
        <NSpace :size="12">
          <NButton size="large" @click="handleCancel">取消</NButton>
          <NButton
            type="primary"
            size="large"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEdit ? '更新练习记录' : '保存练习记录' }}
          </NButton>
        </NSpace>
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.entry-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}
.form-col {
  flex: 1;
  min-width: 0;
}
.form-col-full {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

/* 响应式 */
@media (max-width: 767px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
