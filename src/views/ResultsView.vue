<script setup>
import { computed, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useExecutionStore, formatRowPreview } from '../stores/execution.js'
import ResultStepList from '../components/ResultStepList.vue'
import { statusLabel } from '../utils/status.js'

const execution = useExecutionStore()

const filters = [
  { value: 'all', label: '全部' },
  { value: 'running', label: '运行中' },
  { value: 'passed', label: '已通过' },
  { value: 'failed', label: '失败' }
]

const densityOptions = [
  { value: 'comfortable', label: '标准' },
  { value: 'compact', label: '极简' }
]

const density = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('gs.cardDensity') === 'compact'
    ? 'compact'
    : 'comfortable'
)

watch(density, (v) => {
  try {
    localStorage.setItem('gs.cardDensity', v)
  } catch {
    /* ignore */
  }
})

const hasDetail = computed(() => !!execution.selectedId)
const selected = computed(() => execution.selectedResult)

const retryLabel = computed(() => {
  if (selected.value?.dataDriven) return '重试本行'
  return '重试'
})

const selectedRowPreview = computed(() => {
  const s = selected.value
  if (!s?.dataDriven) return ''
  return formatRowPreview(s.tableHeaders, s.tableRow)
})

const selectedTableData = computed(() => {
  const s = selected.value
  if (!s?.dataDriven) return []
  return s.tableRows || (s.tableRow ? [s.tableRow] : [])
})

function conceptCount(steps) {
  let n = 0
  const walk = (st) => {
    if (st.kind === 'concept') n += 1
    ;(st.children || []).forEach(walk)
  }
  ;(steps || []).forEach(walk)
  return n
}

function cardTitle(r) {
  return r.name || 'Scenario'
}

function rowPreview(r) {
  if (!r?.dataDriven) return ''
  return formatRowPreview(r.tableHeaders, r.tableRow)
}

function ddBadge(r) {
  if (!r?.dataDriven) return ''
  const preview = rowPreview(r)
  if (preview) return `行 ${r.rowIndex} · ${preview}`
  return `数据驱动 · 行 ${r.rowIndex}`
}

function tableRowClass({ rowIndex }) {
  if (rowIndex + 1 === selected.value?.rowIndex) return 'current-dd-row'
  return ''
}
</script>

<template>
  <div class="gs-panel">
    <div class="gs-panel-header">
      <div>
        <span class="stage-kicker">Results</span>
        <h2>运行结果</h2>
      </div>
      <div class="results-toolbar">
        <el-segmented v-model="density" :options="densityOptions" />
        <el-segmented v-model="execution.resultsFilter" :options="filters" />
      </div>
    </div>
    <div class="results-body" :class="{ 'no-detail': !hasDetail }">
      <div class="card-grid" :class="density">
        <el-empty
          v-if="!execution.filteredResults.length"
          :image-size="72"
          description="尚无结果。运行后 Scenario 卡片将出现在此处。"
        />
        <button
          v-for="r in execution.filteredResults"
          :key="r.id"
          type="button"
          class="scenario-card"
          :class="{ selected: execution.selectedId === r.id }"
          :data-status="r.status"
          :data-density="density"
          :title="
            density === 'compact'
              ? [cardTitle(r), rowPreview(r) || (r.dataDriven ? `行 ${r.rowIndex}` : ''), r.specPath]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          "
          @click="execution.selectResult(r.id)"
        >
          <template v-if="density === 'compact'">
            <h3 class="card-title">{{ cardTitle(r) }}</h3>
            <div class="card-compact-sub">
              <el-tag v-if="r.dataDriven" size="small" type="primary" effect="plain" :title="ddBadge(r)">
                行 {{ r.rowIndex }}
                <template v-if="rowPreview(r)"> · {{ rowPreview(r) }}</template>
              </el-tag>
              <span class="card-spec">{{ r.specPath }}</span>
              <span class="card-meta-top">{{ r.stepsDone || 0 }}/{{ r.stepsTotal || 0 }}</span>
            </div>
          </template>
          <template v-else>
            <div class="card-top">
              <span class="card-status">{{ statusLabel(r.status) }}</span>
              <span class="card-meta-top">{{ r.duration || '' }}</span>
            </div>
            <h3 class="card-title">{{ cardTitle(r) }}</h3>
            <div class="card-badges">
              <el-tag v-if="r.dataDriven" size="small" type="primary" effect="plain">
                数据驱动 · 行 {{ r.rowIndex }}
              </el-tag>
              <el-tag v-if="conceptCount(r.steps)" size="small" type="success" effect="plain">
                {{ conceptCount(r.steps) }} Concept
              </el-tag>
            </div>
            <div v-if="rowPreview(r)" class="card-row-preview" :title="rowPreview(r)">
              {{ rowPreview(r) }}
            </div>
            <div class="card-spec" :title="r.specPath">{{ r.specPath }}</div>
            <div class="card-meta">
              <span :title="r.specName || ''">{{ r.specName || '' }}</span>
              <span>{{ r.stepsDone || 0 }}/{{ r.stepsTotal || 0 }} steps</span>
            </div>
          </template>
        </button>
      </div>

      <aside v-if="hasDetail" class="scenario-detail" aria-label="Scenario 详情">
        <div class="scenario-detail-header">
          <div class="detail-heading">
            <el-tag :type="selected?.status === 'failed' ? 'danger' : selected?.status === 'passed' ? 'success' : selected?.status === 'running' ? '' : 'warning'" size="small">
              {{ statusLabel(selected?.status) }}
            </el-tag>
            <h3>
              {{ selected?.name }}
              <template v-if="selected?.dataDriven && selected?.rowIndex">
                · 行 {{ selected.rowIndex
                }}<template v-if="selected.rowCount">/{{ selected.rowCount }}</template>
              </template>
            </h3>
            <div class="card-spec" :title="selected?.specPath">{{ selected?.specPath }}</div>
            <div v-if="selectedRowPreview" class="card-row-preview detail-row-preview">
              {{ selectedRowPreview }}
            </div>
          </div>
          <el-space>
            <el-button
              type="primary"
              :disabled="execution.running || !selected || selected.status === 'running'"
              :title="selected?.dataDriven ? `仅重跑数据驱动第 ${selected.rowIndex} 行` : '重试当前 Scenario'"
              @click="execution.retrySelected()"
            >
              {{ retryLabel }}
            </el-button>
            <el-button :icon="Close" @click="execution.closeDetail()">关闭</el-button>
          </el-space>
        </div>
        <el-scrollbar class="detail-scroll">
          <template v-if="selected?.dataDriven && selected?.tableHeaders?.length">
            <div class="detail-section-title">
              数据驱动 · 行 {{ selected.rowIndex
              }}<template v-if="selected.rowCount">/{{ selected.rowCount }}</template>
            </div>
            <el-table
              :data="selectedTableData"
              size="small"
              border
              :row-class-name="tableRowClass"
              class="dd-el-table"
            >
              <el-table-column
                v-for="h in selected.tableHeaders"
                :key="h"
                :prop="h"
                :label="h"
                min-width="96"
                show-overflow-tooltip
              />
            </el-table>
          </template>
          <div class="detail-section-title">Steps</div>
          <el-empty
            v-if="!selected?.steps?.length"
            :image-size="56"
            description="暂无步骤详情（等待 Step/Concept 事件）。"
          />
          <ResultStepList v-else :steps="selected.steps" />
        </el-scrollbar>
      </aside>
    </div>
  </div>
</template>
