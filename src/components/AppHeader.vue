<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  VideoPlay,
  VideoPause,
  RefreshLeft,
  Delete,
  Setting,
  Monitor,
  List,
  EditPen
} from '@element-plus/icons-vue'
import { useAppStore } from '../stores/app.js'
import { useExecutionStore } from '../stores/execution.js'
import { useConsoleStore } from '../stores/console.js'
import { statusTagType } from '../utils/status.js'
import logoUrl from '../assets/logo.png'

const route = useRoute()
const app = useAppStore()
const execution = useExecutionStore()
const consoleStore = useConsoleStore()

const tabs = [
  { name: 'console', path: '/console', label: '控制台', icon: Monitor },
  { name: 'live', path: '/live', label: '实时运行', icon: VideoPlay },
  { name: 'results', path: '/results', label: '运行结果', icon: List },
  { name: 'editor', path: '/editor', label: 'Spec 编辑', icon: EditPen }
]

const reporterType = computed(() => {
  if (execution.running) return 'primary'
  if (app.wsClients > 0) return 'success'
  return 'warning'
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
        <el-tooltip v-if="app.project" :content="app.project.path" placement="bottom">
          <span class="project-name">{{ app.project.name }}</span>
        </el-tooltip>
      </div>

      <el-menu class="page-menu" mode="horizontal" :ellipsis="false" router :default-active="route.path">
        <el-menu-item v-for="t in tabs" :key="t.name" :index="t.path">
          <el-icon><component :is="t.icon" /></el-icon>
          <span>{{ t.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="chrome-spacer" />

      <el-tag :type="reporterType" effect="plain" round>
        Studio Reporter: {{ app.wsPort }}
      </el-tag>
      <el-button :icon="Setting" @click="app.settingsOpen = true">设置</el-button>
    </div>

    <div class="chrome-row run">
      <el-button type="primary" :icon="VideoPlay" :disabled="execution.running" @click="execution.startRun()">
        Run
      </el-button>
      <el-button type="danger" plain :icon="VideoPause" :disabled="!execution.running" @click="execution.stopRun()">
        Stop
      </el-button>
      <el-button
        :icon="RefreshLeft"
        :disabled="execution.running || execution.failedCount === 0"
        title="重试全部失败的 Scenario（数据驱动按失败行）"
        @click="execution.retryFailed()"
      >
        重试失败{{ execution.failedCount ? ` (${execution.failedCount})` : '' }}
      </el-button>
      <el-button :icon="Delete" @click="clearAll()">清空结果</el-button>

      <div class="toolbar-field">
        <span class="toolbar-label">Tags</span>
        <el-input v-model="app.tags" placeholder="通用" clearable style="width: 160px" />
      </div>

      <el-tag :type="statusTagType(statusState)" effect="light" class="status-tag">
        {{ app.status.text }}
      </el-tag>

      <div class="counters">
        <el-tag type="success" effect="light" title="通过的 Scenario 数">✓ {{ execution.counts.pass }}</el-tag>
        <el-tag type="danger" effect="light" title="失败的 Scenario 数">✗ {{ execution.counts.fail }}</el-tag>
        <el-tag type="warning" effect="light" title="跳过的 Scenario 数">– {{ execution.counts.skip }}</el-tag>
        <el-tag type="info" effect="light" title="运行中的 Scenario 数">◌ {{ execution.counts.run }}</el-tag>
      </div>
    </div>
  </header>
</template>
