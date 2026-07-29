<script setup>
import { computed } from 'vue'
import { useExecutionStore, formatRowPreview } from '../stores/execution.js'

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

function statusIcon(status) {
  return execution.iconFor(status)
}
</script>

<template>
  <div class="panel live">
    <div class="panel-header">
      <h2>实时 Scenario</h2>
      <span class="text-xs text-[var(--text-muted)] max-w-[60%] text-right truncate">{{ meta }}</span>
    </div>
    <div class="flex-1 overflow-auto min-h-0">
      <div
        v-if="!execution.currentScenario"
        class="empty-hint"
      >
        点击 <strong>Run</strong> 查看当前 Scenario 执行过程。<br />
        实时树只保留正在跑的 Scenario（含 Concept / Step）。
      </div>
      <ul v-else class="tree">
        <li>
          <div class="node focused" :data-status="execution.currentScenario.status" data-kind="scenario">
            <span class="node-icon">{{ statusIcon(execution.currentScenario.status) }}</span>
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
          <LiveSteps :steps="execution.currentScenario.steps" />
        </li>
      </ul>
      <div class="fail-detail" :class="{ show: !!execution.liveFailText }">
        <h3>失败详情</h3>
        <pre>{{ execution.liveFailText }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, h } from 'vue'
import { useExecutionStore } from '../stores/execution.js'

function renderTables(tables) {
  if (!tables?.length) return null
  return h(
    'div',
    { class: 'live-tables' },
    tables.map((t, ti) =>
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
  )
}

const LiveSteps = defineComponent({
  name: 'LiveSteps',
  props: { steps: { type: Array, default: () => [] } },
  setup(props) {
    const execution = useExecutionStore()
    const renderNodes = (steps) =>
      h(
        'ul',
        {},
        (steps || []).map((st) =>
          h('li', {}, [
            h(
              'div',
              {
                class: 'node',
                'data-status': st.status,
                'data-kind': st.kind || 'step'
              },
              [
                h('span', { class: 'node-icon' }, execution.iconFor(st.status)),
                h('div', { class: 'node-label' }, [
                  h('strong', {}, [
                    h('span', { class: 'kind' }, st.kind === 'concept' ? 'concept' : 'step'),
                    st.text
                  ]),
                  renderTables(st.tables)
                ]),
                h(
                  'span',
                  { class: 'node-meta' },
                  st.status === 'skipped' ? 'skipped' : st.ms != null ? `${st.ms}ms` : ''
                )
              ]
            ),
            st.kind === 'concept' && st.children?.length ? renderNodes(st.children) : null
          ])
        )
      )
    return () => renderNodes(props.steps)
  }
})

export default {
  components: { LiveSteps }
}
</script>
