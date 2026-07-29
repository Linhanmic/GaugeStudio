<script setup>
import { computed, ref, watch } from 'vue'
import { useExecutionStore, formatRowPreview } from '../stores/execution.js'

const execution = useExecutionStore()

const filters = [
  { id: 'all', label: '全部' },
  { id: 'running', label: '运行中' },
  { id: 'passed', label: '已通过' },
  { id: 'failed', label: '失败' }
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

function statusLabel(s) {
  return ({ passed: 'PASSED', failed: 'FAILED', running: 'RUNNING', skipped: 'SKIPPED' })[s] || s || '—'
}

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
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2>运行结果</h2>
      <div class="results-toolbar">
        <div class="density-toggle" role="group" aria-label="卡片密度">
          <button
            type="button"
            class="density-btn"
            :class="{ active: density === 'comfortable' }"
            title="标准卡片"
            @click="density = 'comfortable'"
          >
            标准
          </button>
          <button
            type="button"
            class="density-btn"
            :class="{ active: density === 'compact' }"
            title="极简卡片，一屏展示更多"
            @click="density = 'compact'"
          >
            极简
          </button>
        </div>
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          class="filter-chip"
          :class="{ active: execution.resultsFilter === f.id }"
          @click="execution.resultsFilter = f.id"
        >
          {{ f.label }}
        </button>
      </div>
    </div>
    <div class="results-body" :class="{ 'no-detail': !hasDetail }">
      <div class="card-grid" :class="density">
        <div v-if="!execution.filteredResults.length" class="results-empty">
          尚无结果。运行后 Scenario 卡片将出现在此处。
        </div>
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
              <span v-if="r.dataDriven" class="card-badge dd" :title="ddBadge(r)">
                行 {{ r.rowIndex }}
                <template v-if="rowPreview(r)"> · {{ rowPreview(r) }}</template>
              </span>
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
              <span v-if="r.dataDriven" class="card-badge dd">
                数据驱动 · 行 {{ r.rowIndex }}
              </span>
              <span v-if="conceptCount(r.steps)" class="card-badge concept">
                {{ conceptCount(r.steps) }} Concept
              </span>
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
            <div class="card-status" :data-status="selected?.status">{{ statusLabel(selected?.status) }}</div>
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
          <div class="flex gap-2 flex-shrink-0">
            <button
              class="btn-run btn-sm"
              type="button"
              :disabled="execution.running || !selected || selected.status === 'running'"
              :title="selected?.dataDriven ? `仅重跑数据驱动第 ${selected.rowIndex} 行` : '重试当前 Scenario'"
              @click="execution.retrySelected()"
            >
              {{ retryLabel }}
            </button>
            <button class="btn-ghost btn-sm" type="button" @click="execution.closeDetail()">关闭</button>
          </div>
        </div>
        <div class="detail-scroll">
          <template v-if="selected?.dataDriven && selected?.tableHeaders?.length">
            <div class="detail-section-title">
              数据驱动 · 行 {{ selected.rowIndex
              }}<template v-if="selected.rowCount">/{{ selected.rowCount }}</template>
            </div>
            <div class="dd-table-wrap">
              <table class="dd-table">
                <thead>
                  <tr>
                    <th v-for="h in selected.tableHeaders" :key="h">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in selected.tableRows || [selected.tableRow]"
                    :key="i"
                    :class="{ current: i + 1 === selected.rowIndex }"
                  >
                    <td v-for="h in selected.tableHeaders" :key="h">{{ row?.[h] ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <div class="detail-section-title">Steps</div>
          <div v-if="!selected?.steps?.length" class="detail-empty">暂无步骤详情（等待 Step/Concept 事件）。</div>
          <DetailSteps v-else :steps="selected.steps" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import { defineComponent, h } from 'vue'

function statusLabel(s) {
  return ({ passed: 'passed', failed: 'failed', running: 'running', skipped: 'skipped' })[s] || s || ''
}

function renderTables(tables) {
  if (!tables?.length) return null
  return tables.map((t, ti) =>
    h('div', { key: `tbl-${ti}`, class: 'step-table-wrap' }, [
      h('table', { class: 'step-table' }, [
        t.headers?.length
          ? h(
              'thead',
              {},
              h(
                'tr',
                {},
                t.headers.map((c, i) => h('th', { key: i }, c))
              )
            )
          : null,
        h(
          'tbody',
          {},
          (t.rows || []).map((row, ri) =>
            h(
              'tr',
              { key: ri },
              row.map((c, ci) => h('td', { key: ci }, c))
            )
          )
        )
      ])
    ])
  )
}

const DetailSteps = defineComponent({
  name: 'DetailSteps',
  props: { steps: { type: Array, default: () => [] } },
  setup(props) {
    const render = (steps, prefix = '') =>
      (steps || []).map((st, i) => {
        const indexLabel = prefix ? `${prefix}.${i + 1}` : String(i + 1)
        const concept = st.kind === 'concept'
        return h('div', { key: `${indexLabel}-${st.text}`, class: ['step-item', concept && 'concept'], 'data-status': st.status }, [
          h('div', { class: 'step-item-top' }, [
            h('div', { class: 'step-text-wrap' }, [
              concept ? h('span', { class: 'step-kind' }, 'Concept') : null,
              h('div', { class: 'step-text' }, `${indexLabel}. ${st.text}`)
            ]),
            h(
              'div',
              { class: 'step-meta' },
              [statusLabel(st.status), st.ms != null ? ` · ${st.ms}ms` : ''].join('')
            )
          ]),
          renderTables(st.tables),
          st.error ? h('div', { class: 'step-error' }, st.error) : null,
          st.children?.length ? h('div', { class: 'step-children' }, render(st.children, indexLabel)) : null
        ])
      })
    return () => h('div', { class: 'step-list' }, render(props.steps))
  }
})

export default {
  components: { DetailSteps }
}
</script>
