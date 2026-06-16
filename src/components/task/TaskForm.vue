<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
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
  editData?: PracticeTask | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: TaskFormData]
}>()

export interface TaskFormData {
  task_name: string
  status: TaskStatus
}

const formRef = ref<FormInst | null>(null)
const message = useMessage()

const formData = ref<TaskFormData>({
  task_name: '',
  status: '未开始',
})

const rules: FormRules = {
  task_name: { required: true, message: '请输入任务名称', trigger: 'blur' },
  status: { required: true, message: '请选择状态', trigger: 'blur' },
}

// 编辑模式预填
watch(
  () => props.editData,
  (data) => {
    if (data) {
      formData.value = {
        task_name: data.task_name,
        status: data.status,
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
        task_name: '',
        status: '未开始',
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
            placeholder="如：加强言语理解、巩固资料分析"
          />
        </NFormItem>

        <NFormItem path="status" label="状态" label-placement="top">
          <NSelect
            v-model:value="formData.status"
            :options="TASK_STATUS_OPTIONS"
          />
        </NFormItem>
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
  width: 420px;
  padding: 24px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.task-form-modal h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
</style>
