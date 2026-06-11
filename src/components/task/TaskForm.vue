<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NDatePicker,
  NButton,
  NSpace,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { TASK_STATUS_OPTIONS } from '@/utils/constants'
import type { PracticeTask, TaskStatus } from '@/types/exam'

const props = defineProps<{
  show: boolean
  sectionOptions: { label: string; value: number }[]
  editData?: PracticeTask | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: TaskFormData]
}>()

export interface TaskFormData {
  section_id: number | null
  task_name: string
  total_questions: number
  completed_questions: number
  status: TaskStatus
  deadline: string | null
}

const formRef = ref<FormInst | null>(null)
const message = useMessage()

// 表单数据
const formData = ref<TaskFormData>({
  section_id: null,
  task_name: '',
  total_questions: 0,
  completed_questions: 0,
  status: '未开始',
  deadline: null,
})

const rules: FormRules = {
  task_name: { required: true, message: '请输入任务名称', trigger: 'blur' },
  total_questions: { required: true, message: '请输入总题数', trigger: 'blur', type: 'number' },
  status: { required: true, message: '请选择状态', trigger: 'blur' },
}

// 编辑模式预填
watch(
  () => props.editData,
  (data) => {
    if (data) {
      formData.value = {
        section_id: data.section_id,
        task_name: data.task_name,
        total_questions: data.total_questions,
        completed_questions: data.completed_questions,
        status: data.status,
        deadline: data.deadline,
      }
    }
  },
  { immediate: true }
)

// 打开时重置
watch(
  () => props.show,
  (v) => {
    if (v && !props.editData) {
      formData.value = {
        section_id: null,
        task_name: '',
        total_questions: 0,
        completed_questions: 0,
        status: '未开始',
        deadline: null,
      }
    }
  }
)

function handleSubmit() {
  formRef.value?.validate((errors) => {
    if (errors) {
      message.warning('请完善必填项')
      return
    }
    emit('submit', { ...formData.value })
    emit('update:show', false)
  })
}

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)" :mask-closable="false">
    <div class="task-form-modal">
      <h3>{{ editData ? '编辑任务' : '新建任务' }}</h3>
      <NForm ref="formRef" :model="formData" :rules="rules">
        <NFormItem path="task_name" label="任务名称" label-placement="top">
          <NInput
            v-model:value="formData.task_name"
            placeholder="如：加强削弱专项练习 100 题"
          />
        </NFormItem>

        <NFormItem path="section_id" label="关联板块（可选）" label-placement="top">
          <NSelect
            v-model:value="formData.section_id"
            :options="sectionOptions"
            placeholder="选择关联的考试板块..."
            clearable
            filterable
          />
        </NFormItem>

        <div style="display: flex; gap: 12px">
          <NFormItem path="total_questions" label="总题数" label-placement="top" style="flex: 1">
            <NInputNumber
              v-model:value="formData.total_questions"
              :min="0"
              placeholder="0"
            />
          </NFormItem>
          <NFormItem path="completed_questions" label="已完成" label-placement="top" style="flex: 1">
            <NInputNumber
              v-model:value="formData.completed_questions"
              :min="0"
              :max="formData.total_questions"
              placeholder="0"
            />
          </NFormItem>
        </div>

        <div style="display: flex; gap: 12px">
          <NFormItem path="status" label="状态" label-placement="top" style="flex: 1">
            <NSelect
              v-model:value="formData.status"
              :options="TASK_STATUS_OPTIONS"
            />
          </NFormItem>
          <NFormItem path="deadline" label="截止时间" label-placement="top" style="flex: 1">
            <NDatePicker
              :value="formData.deadline ? new Date(formData.deadline).getTime() : null"
              @update:value="(v: number | null) => {
                formData.deadline = v ? new Date(v).toISOString().split('T')[0] : null
              }"
              type="date"
              style="width: 100%"
            />
          </NFormItem>
        </div>
      </NForm>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="handleClose">取消</NButton>
        <NButton type="primary" @click="handleSubmit">保存</NButton>
      </NSpace>
    </div>
  </NModal>
</template>

<style scoped>
.task-form-modal {
  width: 520px;
  padding: 24px;
  background: var(--card-color, #fff);
  border-radius: 8px;
}
.task-form-modal h3 {
  margin: 0 0 16px;
}
</style>
