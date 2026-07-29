<script setup>
import { onMounted, computed } from 'vue'
import { useAppStore } from './stores/app.js'
import { useExecutionStore } from './stores/execution.js'
import { useConsoleStore } from './stores/console.js'
import ChromeBar from './components/ChromeBar.vue'
import SpecTree from './components/SpecTree.vue'
import ConsolePage from './components/ConsolePage.vue'
import LivePage from './components/LivePage.vue'
import ResultsPage from './components/ResultsPage.vue'
import EditorPage from './components/EditorPage.vue'
import SettingsModal from './components/SettingsModal.vue'

const app = useAppStore()
const execution = useExecutionStore()
const consoleStore = useConsoleStore()

onMounted(async () => {
  execution.bindEvents()
  consoleStore.bindEvents()
  await app.init()
})

const toastVisible = computed(() => !!app.toast)
</script>

<template>
  <div class="app-shell">
    <ChromeBar />
    <div class="workspace">
      <aside class="panel sidebar">
        <div class="panel-header">
          <h2>测试脚本</h2>
          <div class="header-actions">
            <button
              class="btn-ghost"
              type="button"
              title="重新扫描项目 Spec / Concept"
              :disabled="!app.project"
              @click="app.refreshProject()"
            >
              刷新
            </button>
            <button class="btn-ghost" type="button" @click="app.pickAndOpenProject()">打开</button>
            <button class="btn-ghost" type="button" @click="app.expandAll()">展开</button>
            <button class="btn-ghost" type="button" @click="app.collapseAll()">折叠</button>
          </div>
        </div>
        <div class="sidebar-body">
          <div v-if="!app.project" class="empty-hint" style="padding: 24px 12px; text-align: left">
            点击「打开」选择 Gauge 项目目录<br />
            <code style="font-family: var(--mono); font-size: 12px">例如 gauge-js-demo</code>
          </div>
          <SpecTree v-else />
        </div>
      </aside>

      <section class="main">
        <ConsolePage v-show="app.page === 'console'" />
        <LivePage v-show="app.page === 'live'" />
        <ResultsPage v-show="app.page === 'results'" />
        <EditorPage v-show="app.page === 'editor'" />
      </section>
    </div>

    <SettingsModal />
    <div class="toast" :class="{ show: toastVisible }" role="status">{{ app.toast }}</div>
  </div>
</template>
