<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NCard,
  NButton,
  NSpace,
  NInput,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'
import { useIdiomStore } from '@/stores/idiom'
import { fetchDefinition } from '@/utils/llm'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const idiomStore = useIdiomStore()

const isEdit = ref(false)
const loading = ref(false)
const fetching = ref(false)
const saving = ref(false)

const word = ref('')
const notes = ref('')
const definition = ref('')

onMounted(async () => {
  const editId = route.query.edit ? Number(route.query.edit) : null
  if (editId && editId > 0) {
    isEdit.value = true
    loading.value = true
    try {
      await idiomStore.fetchRecordById(editId)
      if (idiomStore.currentRecord) {
        const r = idiomStore.currentRecord
        word.value = r.word
        notes.value = r.notes || ''
        definition.value = r.definition
      }
    } catch (e) {
      message.error('加载失败: ' + String(e))
    } finally {
      loading.value = false
    }
  }
})

async function handleFetchDefinition() {
  if (!word.value.trim()) {
    message.warning('请先输入成语或词语')
    return
  }
  fetching.value = true
  try {
    definition.value = await fetchDefinition(word.value.trim())
    message.success('释义获取成功')
  } catch (e) {
    message.error(String(e))
  } finally {
    fetching.value = false
  }
}

async function handleSave() {
  if (!word.value.trim()) {
    message.warning('请输入成语或词语')
    return
  }
  if (!definition.value.trim()) {
    message.warning('请先获取释义')
    return
  }

  saving.value = true
  try {
    if (isEdit.value && idiomStore.currentRecord) {
      await idiomStore.updateRecord(idiomStore.currentRecord.id, {
        word: word.value.trim(),
        definition: definition.value.trim(),
        notes: notes.value.trim() || null,
      })
      message.success('已更新')
    } else {
      await idiomStore.createRecord(word.value.trim(), definition.value.trim(), notes.value.trim() || null)
      message.success('已保存')
    }
    router.push('/idioms')
  } catch (e) {
    message.error('保存失败: ' + String(e))
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  router.push('/idioms')
}
</script>

<template>
  <div>
    <NSpin :show="loading">
      <div class="entry-header">
        <h2 class="entry-title">{{ isEdit ? '编辑成语' : '添加成语/词语' }}</h2>
        <NSpace :size="10">
          <NButton size="medium" @click="handleCancel">取消</NButton>
          <NButton type="primary" size="medium" :loading="saving" @click="handleSave">
            {{ isEdit ? '更新' : '保存' }}
          </NButton>
        </NSpace>
      </div>

      <NCard style="margin-bottom: 16px">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; gap: 16px;">
            <div style="flex: 1; min-width: 0">
              <label class="field-label">成语/词语 *</label>
              <NInput v-model:value="word" placeholder="如：未雨绸缪" />
            </div>
            <div style="flex: 1; min-width: 0">
              <label class="field-label">备注</label>
              <NInput v-model:value="notes" placeholder="选填，如：常用于写作" />
            </div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <label class="field-label" style="margin: 0">释义 *</label>
              <NButton size="small" type="primary" dashed :loading="fetching" @click="handleFetchDefinition">
                {{ definition ? '重新获取' : '获取释义' }}
              </NButton>
            </div>
            <div v-if="definition" class="definition-box">
              <NText>{{ definition }}</NText>
            </div>
            <div v-else class="definition-empty">
              <NText depth="3">点击「获取释义」通过 AI 自动生成</NText>
            </div>
          </div>
        </div>
      </NCard>

      <div style="text-align: center">
        <NSpace :size="12">
          <NButton size="large" @click="handleCancel">取消</NButton>
          <NButton type="primary" size="large" :loading="saving" @click="handleSave">
            {{ isEdit ? '更新记录' : '保存记录' }}
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
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.definition-box {
  padding: 14px 16px;
  background: var(--primary-light);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
  min-height: 60px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}
.definition-empty {
  padding: 24px;
  text-align: center;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-light);
}
</style>
