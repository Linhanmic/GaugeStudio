<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { VideoPlay, VideoPause, RefreshLeft, Delete } from '@element-plus/icons-vue'
import { useAppStore } from '../stores/app.js'
import { useExecutionStore } from '../stores/execution.js'
import { useConsoleStore } from '../stores/console.js'

const route = useRoute()
const app = useAppStore()
const execution = useExecutionStore()
const consoleStore = useConsoleStore()

const pageTitle = computed(() => route.meta.title || 'GaugeStudio')

const statusTone = computed(() => {
  const s = app.status.state
  if (s === 'running' || s === 'passed' || s === 'failed') return s
  return 'idle'
})

function clearAll() {
  execution.clearResults()
  consoleStore.clear()
  app.status = { state: 'idle', text: '就绪' }
}
</script>

<template>
  <header class="dock">
    <div class="dock-page">
      <span class="dock-kicker">Workspace</span>
      <h1>{{ pageTitle }}</h1>
    </div>

    <div class="dock-run">
      <button
        class="run-btn"
        type="button"
        :disabled="execution.running"
        :class="{ busy: execution.running }"
        @click="execution.startRun()"
      >
        <el-icon><VideoPlay /></el-icon>
        Run
      </button>
      <button class="ghost-btn danger" type="button" :disabled="!execution.running" @click="execution.stopRun()">
        <el-icon><VideoPause /></el-icon>
        Stop
      </button>
      <button
        class="ghost-btn"
        type="button"
        :disabled="execution.running || execution.failedCount === 0"
        title="重试全部失败的 Scenario（数据驱动按失败行）"
        @click="execution.retryFailed()"
      >
        <el-icon><RefreshLeft /></el-icon>
        重试失败
        <em v-if="execution.failedCount">{{ execution.failedCount }}</em>
      </button>
      <button class="ghost-btn" type="button" @click="clearAll()">
        <el-icon><Delete /></el-icon>
        清空
      </button>
    </div>

    <label class="dock-tags">
      <span>Tags</span>
      <el-input v-model="app.tags" placeholder="通用" clearable />
    </label>

    <div class="dock-state" :data-state="statusTone">
      <i class="state-dot" />
      <span>{{ app.status.text }}</span>
    </div>
  </header>
</template>
