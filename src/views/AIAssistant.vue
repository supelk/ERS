<script setup lang="ts">
import { NCard, NText, NH2, NResult, NSpace } from 'naive-ui'
</script>

<template>
  <div>
    <NH2>AI 复盘助手</NH2>
    <NCard>
      <NResult
        status="info"
        title="功能即将上线"
        description="AI 自动分析、智能目标推荐、个性化学习路径等功能正在开发中..."
      >
        <template #footer>
          <NSpace justify="center">
            <NText depth="3">敬请期待</NText>
          </NSpace>
        </template>
      </NResult>
    </NCard>
  </div>
</template>
