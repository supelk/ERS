<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NInput, NText, useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('')

async function handleLogin() {
  try {
    await authStore.login(username.value, password.value)
    router.push(String(route.query.redirect || '/exams'))
  } catch (error) {
    message.error('登录失败：' + String(error))
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-shell">
      <div class="brand-panel">
        <div class="brand-mark">ERS</div>
        <h1>考试复盘系统</h1>
        <p>登录后使用云端数据，AI 与 OCR 密钥由服务器统一保护。</p>
      </div>
      <NCard class="login-card" :bordered="false">
        <h2>登录</h2>
        <NText depth="3">使用管理员分配的账号进入系统。</NText>
        <div class="form-stack">
          <NInput v-model:value="username" placeholder="用户名" @keydown.enter="handleLogin" />
          <NInput v-model:value="password" type="password" show-password-on="click" placeholder="密码" @keydown.enter="handleLogin" />
          <NButton type="primary" block :loading="authStore.loading" @click="handleLogin">登录</NButton>
        </div>
      </NCard>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(91, 141, 239, 0.12), transparent 38%),
    linear-gradient(315deg, rgba(16, 185, 129, 0.10), transparent 42%),
    #f7f8fb;
}
.login-shell {
  width: min(880px, 100%);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: #fff;
  border: 1px solid #e7ebf0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(31, 41, 55, 0.12);
}
.brand-panel {
  padding: 44px;
  background: #102033;
  color: #f8fafc;
}
.brand-mark {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 6px;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 48px;
}
.brand-panel h1 {
  margin: 0 0 12px;
  font-size: 30px;
}
.brand-panel p {
  margin: 0;
  color: rgba(248, 250, 252, 0.76);
  line-height: 1.7;
}
.login-card {
  border-radius: 0;
  padding: 24px;
}
.login-card h2 {
  margin: 0 0 8px;
  font-size: 24px;
}
.form-stack {
  margin-top: 28px;
  display: grid;
  gap: 14px;
}
@media (max-width: 760px) {
  .login-shell {
    grid-template-columns: 1fr;
  }
  .brand-panel {
    padding: 30px;
  }
  .brand-mark {
    margin-bottom: 24px;
  }
}
</style>
