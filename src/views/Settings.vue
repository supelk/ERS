<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import {
  NCard,
  NButton,
  NDivider,
  NSwitch,
  NText,
  NPopconfirm,
  NInput,
  NSpace,
  NDataTable,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore, type AppUser } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useExamStore } from '@/stores/exam'
import { useTaskStore } from '@/stores/task'
import { api } from '@/utils/api'

const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const authStore = useAuthStore()
const usersStore = useUsersStore()
const examStore = useExamStore()
const taskStore = useTaskStore()

const clearingData = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const resetPassword = ref<Record<number, string>>({})

onMounted(async () => {
  if (authStore.isAdmin) await usersStore.fetchUsers()
})

async function handleClearAllData() {
  clearingData.value = true
  try {
    await api.delete('/auth/me/data')
    await examStore.fetchExams()
    await taskStore.fetchTasks()
    message.success('当前账号的数据已清空')
  } catch (e) {
    message.error('清空失败: ' + String(e))
  } finally {
    clearingData.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

async function createUser() {
  try {
    await usersStore.createUser(newUsername.value.trim(), newPassword.value)
    newUsername.value = ''
    newPassword.value = ''
    message.success('账号已创建')
  } catch (e) {
    message.error('创建失败: ' + String(e))
  }
}

async function toggleDisabled(user: AppUser) {
  await usersStore.updateUser(user.id, { disabled: !user.disabled })
}

async function updatePassword(user: AppUser) {
  const password = resetPassword.value[user.id]
  if (!password) return
  await usersStore.updateUser(user.id, { password })
  resetPassword.value[user.id] = ''
  message.success('密码已重置')
}

const columns: DataTableColumns<AppUser> = [
  { title: '用户名', key: 'username' },
  { title: '角色', key: 'role' },
  {
    title: '状态',
    key: 'disabled',
    render: (row) => row.disabled ? '已禁用' : '可用',
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) => row.role === 'admin'
      ? '管理员'
      : h('div', { class: 'user-actions' }, [
        h(NInput, {
          value: resetPassword.value[row.id] || '',
          placeholder: '新密码',
          type: 'password',
          size: 'small',
          style: 'width: 120px',
          onUpdateValue: (value: string) => { resetPassword.value[row.id] = value },
        }),
        h(NButton, { size: 'small', onClick: () => updatePassword(row) }, { default: () => '重置' }),
        h(NButton, { size: 'small', type: row.disabled ? 'primary' : 'warning', onClick: () => toggleDisabled(row) }, { default: () => row.disabled ? '启用' : '禁用' }),
      ]),
  },
]
</script>

<template>
  <div>
    <h2 class="settings-title">设置</h2>

    <NCard title="账号" size="small" style="margin-bottom: 16px">
      <div class="setting-row">
        <div>
          <NText strong>{{ authStore.user?.username }}</NText>
          <br />
          <NText depth="3" style="font-size: 12px">角色：{{ authStore.user?.role }}</NText>
        </div>
        <NButton @click="handleLogout">退出登录</NButton>
      </div>
    </NCard>

    <NCard title="外观" size="small" style="margin-bottom: 16px">
      <div class="setting-row">
        <NText>深色模式</NText>
        <NSwitch :value="appStore.isDark" @update:value="appStore.toggleTheme()" />
      </div>
    </NCard>

    <NCard title="服务配置" size="small" style="margin-bottom: 16px">
      <NText depth="3">
        DeepSeek 和 PaddleOCR 密钥已迁移到服务器环境变量，浏览器不会保存或暴露敏感 Key。
      </NText>
    </NCard>

    <NCard v-if="authStore.isAdmin" title="用户管理" size="small" style="margin-bottom: 16px">
      <NSpace style="margin-bottom: 12px">
        <NInput v-model:value="newUsername" placeholder="用户名" style="width: 180px" />
        <NInput v-model:value="newPassword" type="password" placeholder="初始密码" style="width: 180px" />
        <NButton type="primary" @click="createUser">创建账号</NButton>
      </NSpace>
      <NDataTable :columns="columns" :data="usersStore.users" :loading="usersStore.loading" size="small" />
    </NCard>

    <NCard title="数据管理" size="small" style="margin-bottom: 16px">
      <div class="setting-row">
        <div>
          <NText strong>清空当前账号数据</NText>
          <br />
          <NText depth="3" style="font-size: 12px">删除当前账号的考试、练习任务、练习记录和成语记录。此操作不可撤销。</NText>
        </div>
        <NPopconfirm @positive-click="handleClearAllData">
          <template #trigger>
            <NButton type="error" :loading="clearingData">清空数据</NButton>
          </template>
          确认清空当前账号的所有数据？
        </NPopconfirm>
      </div>
    </NCard>

    <NCard title="关于" size="small">
      <div class="about-info">
        <p><b>考试复盘系统</b> v0.2.0-cloud</p>
        <NDivider />
        <p class="about-tech">技术栈：Vue 3 + Fastify + PostgreSQL</p>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.settings-title {
  margin: 0 0 18px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}
.about-info p {
  margin: 4px 0;
}
.about-tech {
  color: var(--text-tertiary);
  font-size: 12px;
}
:deep(.user-actions) {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
