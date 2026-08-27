<script setup>
import { computed } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import { useExecutionStore, formatRowPreview } from '../stores/execution.js'
import LiveStepTree from '../components/LiveStepTree.vue'

const execution = useExecutionStore()

const meta = computed(() => {
  const c = execution.currentScenario
  if (!c) return '仅显示当前正在运行的 Scenario'
  const row =
    c.dataDriven && c.rowIndex
      ? ` · 行 ${c.rowIndex}${c.rowCount ? `/${c.rowCount}` : ''}`
      : ''
  return `${c.specName} / ${c.name}${row}`
})

const rowPreview = computed(() => {
  const c = execution.currentScenario
  if (!c?.dataDriven) return ''
  return formatRowPreview(c.tableHeaders, c.tableRow)
})
</script>

<template>
  <div class="gs-panel live">
    <div class="gs-panel-header">
      <div>
        <span class="stage-kicker">Live</span>
        <h2>当前 Scenario</h2>
      </div>
      <span class="header-meta">{{ meta }}</span>
    </div>
    <el-scrollbar class="page-scroll">
      <div v-if="!execution.currentScenario" class="studio-empty live-empty">
        <el-icon :size="36"><VideoPlay /></el-icon>
        <p>点击顶部 <strong>Run</strong> 后，这里只跟踪正在执行的 Scenario</p>
        <small>含 Concept 嵌套与数据驱动行 · 历史结果在「结果」页</small>
      </div>
      <ul v-else class="tree">
        <li>
          <div class="node focused" :data-status="execution.currentScenario.status" data-kind="scenario">
            <span class="node-icon">{{ execution.iconFor(execution.currentScenario.status) }}</span>
            <div class="node-label">
              <strong>
                <span class="kind">scenario</span>
                {{ execution.currentScenario.name }}
                <template v-if="execution.currentScenario.dataDriven && execution.currentScenario.rowIndex">
                  · 行 {{ execution.currentScenario.rowIndex
                  }}<template v-if="execution.currentScenario.rowCount"
                    >/{{ execution.currentScenario.rowCount }}</template
                  >
                </template>
              </strong>
              <small>{{ execution.currentScenario.specPath }}</small>
              <div v-if="rowPreview" class="live-row-params" :title="rowPreview">
                <span class="live-row-label">数据驱动</span>
                {{ rowPreview }}
              </div>
            </div>
            <span class="node-meta">{{ execution.currentScenario.status }}</span>
          </div>
          <LiveStepTree :steps="execution.currentScenario.steps" />
        </li>
      </ul>
      <el-alert
        v-if="execution.liveFailText"
        title="失败详情"
        type="error"
        :closable="false"
        show-icon
        class="fail-alert"
      >
        <pre>{{ execution.liveFailText }}</pre>
      </el-alert>
    </el-scrollbar>
  </div>
</template>
