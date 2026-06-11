import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useDatabaseStore } from './stores/database'

async function bootstrap() {
  const app = createApp(App)

  // 状态管理
  const pinia = createPinia()
  app.use(pinia)

  // 初始化数据库
  const dbStore = useDatabaseStore()
  try {
    await dbStore.init()
    console.log('[App] Database initialized successfully')
  } catch (e) {
    const errMsg = String(e)
    console.error('[App] Database init failed:', errMsg)
    // 在页面上显示错误信息
    dbStore.initError = errMsg
  }

  // 路由
  app.use(router)

  // 挂载
  app.mount('#app')
}

bootstrap()
