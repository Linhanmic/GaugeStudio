<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { useExecutionStore } from '../stores/execution.js'

const app = useAppStore()
const execution = useExecutionStore()

const reporterTone = computed(() => {
  if (execution.running) return 'run'
  if (app.wsClients > 0) return 'ok'
  return 'warn'
})

const checked = computed(() => app.checkedSpecs.length)
</script>

<template>
  <footer class="statusbar">
    <el-tooltip v-if="app.project" :content="app.project.path" placement="top">
      <span class="sb-item project">{{ app.project.name }}</span>
    </el-tooltip>
    <span v-else class="sb-item muted">未打开项目</span>

    <span class="sb-item">已选 {{ checked }} Spec</span>

    <span class="sb-item" :data-tone="reporterTone">
      Reporter :{{ app.wsPort }}
    </span>

    <span v-if="app.lsp.status" class="sb-item muted">LSP {{ app.lsp.status }}</span>

    <span class="sb-spacer" />

    <span class="sb-count pass" title="通过">✓ {{ execution.counts.pass }}</span>
    <span class="sb-count fail" title="失败">✗ {{ execution.counts.fail }}</span>
    <span class="sb-count skip" title="跳过">– {{ execution.counts.skip }}</span>
    <span class="sb-count run" title="运行中">◌ {{ execution.counts.run }}</span>
  </footer>
</template>
