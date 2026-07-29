<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { useExecutionStore } from '../stores/execution.js'
import { useConsoleStore } from '../stores/console.js'
import logoUrl from '../assets/logo.png'

const app = useAppStore()
const execution = useExecutionStore()
const consoleStore = useConsoleStore()

const tabs = [
  { id: 'console', label: '控制台' },
  { id: 'live', label: '实时运行' },
  { id: 'results', label: '运行结果' },
  { id: 'editor', label: 'Spec 编辑' }
]

const wsDotClass = computed(() => {
  if (execution.running) return 'run'
  if (app.wsClients > 0) return ''
  return 'warn'
})

const statusState = computed(() => {
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
  <header class="chrome">
    <div class="chrome-row top">
      <div class="brand">
        <img class="brand-logo" :src="logoUrl" width="28" height="28" alt="GaugeStudio" />
        <h1>GaugeStudio</h1>
        <span v-if="app.project" :title="app.project.path">{{ app.project.name }}</span>
      </div>

      <nav class="page-tabs" aria-label="页面切换">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="page-tab"
          :class="{ active: app.page === t.id }"
          @click="app.setPage(t.id)"
        >
          {{ t.label }}
        </button>
      </nav>

      <div class="chrome-spacer" />

      <span class="pill">
        <span class="dot" :class="wsDotClass" />
        Studio Reporter: {{ app.wsPort }}
      </span>
      <button class="btn-ghost btn-sm" type="button" @click="app.settingsOpen = true">设置</button>
    </div>

    <div class="chrome-row run">
      <button class="btn-run" type="button" :disabled="execution.running" @click="execution.startRun()">▶ Run</button>
      <button class="btn-stop" type="button" :disabled="!execution.running" @click="execution.stopRun()">■ Stop</button>
      <button
        class="btn-ghost"
        type="button"
        :disabled="execution.running || execution.failedCount === 0"
        title="重试全部失败的 Scenario（数据驱动按失败行）"
        @click="execution.retryFailed()"
      >
        ↻ 重试失败{{ execution.failedCount ? ` (${execution.failedCount})` : '' }}
      </button>
      <button class="btn-ghost" type="button" @click="clearAll()">清空结果</button>

      <div class="toolbar-field">
        <label for="tagsInput">Tags</label>
        <input id="tagsInput" v-model="app.tags" type="text" placeholder="通用" />
      </div>

      <div class="status-badge" :data-state="statusState">
        <span class="dot" :class="statusState === 'running' ? 'run' : statusState === 'failed' ? 'err' : statusState === 'passed' ? '' : 'warn'" />
        <span>{{ app.status.text }}</span>
      </div>

      <div class="counters">
        <span class="counter pass" title="通过的 Scenario 数">✓ {{ execution.counts.pass }}</span>
        <span class="counter fail" title="失败的 Scenario 数">✗ {{ execution.counts.fail }}</span>
        <span class="counter skip" title="跳过的 Scenario 数">– {{ execution.counts.skip }}</span>
        <span class="counter run" title="运行中的 Scenario 数">◌ {{ execution.counts.run }}</span>
      </div>
    </div>
  </header>
</template>
