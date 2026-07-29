import { defineStore } from 'pinia'
import { useAppStore } from './app.js'

const api = () => window.gaugeStudio

function infoOf(payload) {
  return (
    payload?.currentExecutionInfo ||
    payload?.current_execution_info ||
    payload ||
    {}
  )
}

/** Gauge StepInfo wraps ExecuteStepRequest under `.step`. */
function stepRequestOf(stepInfo) {
  if (!stepInfo || typeof stepInfo !== 'object') return null
  return stepInfo.step || stepInfo
}

/** Normalize Gauge ProtoTable → { headers, rows }. */
function normalizeTable(table) {
  if (!table) return null
  const headers = table.headers?.cells || table.Headers?.Cells || []
  const rawRows = table.rows || table.Rows || []
  const rows = rawRows
    .map((r) => r.cells || r.Cells || [])
    .filter((cells) => cells.length)
  if (!headers.length && !rows.length) return null
  return { headers: [...headers], rows }
}

/**
 * Format a parameter for step text.
 * Inline tables are omitted from the text line (rendered as a real table below).
 * Special_String / Multiline: prefer short name when value is huge.
 */
function paramDisplay(p) {
  if (p == null) return { text: null, table: null }
  if (typeof p === 'string') return { text: p, table: null }
  const table = normalizeTable(p.table)
  if (table) return { text: null, table }

  const type = p.parameterType
  const isSpecialFile =
    type === 2 ||
    type === 'Special_String' ||
    type === 'SPECIAL_STRING'
  const isMultiline =
    type === 5 ||
    type === 'Multiline_String' ||
    type === 'MULTILINE_STRING'

  const raw = p.value != null ? String(p.value) : ''
  if ((isSpecialFile || isMultiline) && raw) {
    // Prefer file/arg name for long or multiline payloads
    if (p.name && (raw.includes('\n') || raw.length > 80)) {
      return { text: p.name, table: null }
    }
    if (raw.includes('\n')) {
      const first = raw.split(/\r?\n/).find((l) => l.trim()) || ''
      return { text: first.length > 60 ? `${first.slice(0, 57)}…` : first, table: null }
    }
  }

  if (raw !== '') return { text: raw, table: null }
  if (p.name) return { text: String(p.name), table: null }
  return { text: '', table: null }
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tidyStepText(text) {
  return String(text || '')
    .replace(/\s+"/g, ' "')
    .replace(/"\s+/g, '" ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+$/g, '')
    .replace(/^\s+/g, '')
    .trim()
}

/**
 * Substitute Gauge placeholders and collect inline tables.
 * - named dynamic: <label> → "default"
 * - remaining <x> in order
 * - parsed placeholders: {} → "value" (tables omitted from text)
 * Returns { text, tables }
 */
function applyParams(text, rawParams) {
  const params = Array.isArray(rawParams) ? rawParams : []
  const tables = []
  const displays = params.map((p) => {
    const d = paramDisplay(p)
    if (d.table) tables.push(d.table)
    return d
  })

  if (!text && !tables.length) return { text: '', tables: [] }
  let out = String(text || '')

  // Named <name>
  params.forEach((p, idx) => {
    if (p && typeof p === 'object' && p.name) {
      const d = displays[idx]
      const replacement = d.table != null ? '' : `"${d.text ?? ''}"`
      out = out.replace(new RegExp(`<${escapeRegExp(p.name)}>`, 'g'), replacement)
    }
  })

  // Remaining <any> positional
  if (/<[^>]+>/.test(out) && displays.length) {
    let i = 0
    out = out.replace(/<[^>]+>/g, () => {
      const d = displays[i++]
      if (!d) return ''
      return d.table != null ? '' : `"${d.text ?? ''}"`
    })
  }

  // {} positional (Gauge parsedStepText)
  if (out.includes('{}') && displays.length) {
    let i = 0
    out = out.replace(/\{\}/g, () => {
      const d = displays[i++]
      if (!d) return ''
      return d.table != null ? '' : `"${d.text ?? ''}"`
    })
  }

  // Strip leftover literal [table] / "<table>" / <fileN> artifacts
  out = out
    .replace(/"?\[table\]"?/gi, '')
    .replace(/<table\d*>/gi, '')
    .replace(/<file\d*>/gi, '')
    .replace(/""+/g, '"')

  // Collect tables not already captured via substitution (still list all)
  if (!tables.length) {
    for (const d of displays) {
      if (d.table) tables.push(d.table)
    }
  }

  return { text: tidyStepText(out), tables }
}

function textFromFragments(fragments) {
  if (!fragments?.length) return null
  const tables = []
  const parts = fragments.map((f) => {
    if (f.parameter || f.fragmentType === 1 || f.fragmentType === 'Parameter') {
      const d = paramDisplay(f.parameter)
      if (d.table) {
        tables.push(d.table)
        return ''
      }
      return `"${d.text ?? ''}"`
    }
    return f.text || ''
  })
  return { text: tidyStepText(parts.join('')), tables }
}

/**
 * Normalize ending payload: reporter sends stepResult/scenarioResult (proto),
 * not a flat executionResult (API.md examples were simplified).
 */
function endingResult(payload, info) {
  const wrap = payload?.stepResult || payload?.scenarioResult || null
  const item = wrap?.protoItem
  const exec =
    item?.step?.stepExecutionResult?.executionResult ||
    item?.concept?.conceptExecutionResult?.executionResult ||
    payload?.executionResult ||
    info?.executionResult ||
    null
  const scenario = item?.scenario
  const fromStepFrags = textFromFragments(item?.step?.fragments)
  const fromConceptFrags = textFromFragments(item?.concept?.conceptStep?.fragments)
  return {
    failed:
      !!exec?.failed ||
      !!info?.currentStep?.isFailed ||
      !!info?.currentScenario?.isFailed ||
      !!scenario?.failed,
    skipped: !!exec?.skipScenario || !!item?.step?.stepExecutionResult?.skipped,
    executionTime:
      exec?.executionTime ?? wrap?.executionTime ?? scenario?.executionTime ?? null,
    errorMessage: exec?.errorMessage || info?.currentStep?.errorMessage || '',
    stackTrace: exec?.stackTrace || info?.currentStep?.stackTrace || '',
    displayText:
      fromStepFrags?.text ||
      item?.step?.actualText ||
      fromConceptFrags?.text ||
      item?.concept?.conceptStep?.actualText ||
      null,
    tables: fromStepFrags?.tables?.length
      ? fromStepFrags.tables
      : fromConceptFrags?.tables?.length
        ? fromConceptFrags.tables
        : extractTablesFromParams(
            item?.step?.fragments?.map((f) => f.parameter).filter(Boolean) ||
              item?.concept?.conceptStep?.fragments?.map((f) => f.parameter).filter(Boolean) ||
              []
          )
  }
}

function extractTablesFromParams(rawParams) {
  const tables = []
  for (const p of rawParams || []) {
    const t = normalizeTable(p?.table)
    if (t) tables.push(t)
  }
  return tables
}

function relativizeSpecPath(fileName, projectRoot) {
  if (!fileName) return 'unknown.spec'
  const abs = String(fileName).replace(/\\/g, '/')
  if (projectRoot) {
    const root = String(projectRoot).replace(/\\/g, '/').replace(/\/$/, '')
    if (abs.toLowerCase().startsWith(root.toLowerCase() + '/')) {
      return abs.slice(root.length + 1)
    }
  }
  const idx = abs.toLowerCase().lastIndexOf('/specs/')
  if (idx >= 0) return abs.slice(idx + 1)
  return abs.split('/').slice(-2).join('/')
}

function countConcepts(steps) {
  let n = 0
  function walk(st) {
    if (st.kind === 'concept') n += 1
    ;(st.children || []).forEach(walk)
  }
  ;(steps || []).forEach(walk)
  return n
}

function countLeaves(steps) {
  let n = 0
  function walk(st) {
    if (st.kind === 'concept' && st.children?.length) {
      st.children.forEach(walk)
      return
    }
    n += 1
  }
  ;(steps || []).forEach(walk)
  return n
}

function makeExecutionId(specPath, scenarioName, rowIndex) {
  if (rowIndex != null && rowIndex > 0) {
    return `${specPath}::${scenarioName}::row${rowIndex}`
  }
  return `${specPath}::${scenarioName}`
}

/** Format data-driven row as `key=value · key=value`. */
export function formatRowPreview(headers, row) {
  if (!row || typeof row !== 'object') return ''
  const keys = headers?.length ? headers : Object.keys(row)
  if (!keys.length) return ''
  return keys.map((h) => `${h}=${row[h] ?? ''}`).join(' · ')
}

/**
 * Parse the first markdown data table under a scenario heading (`## name`).
 * Returns { headers, rows } or null.
 */
function parseScenarioDataTable(content, scenarioName) {
  if (!content || !scenarioName) return null
  const lines = String(content).split(/\r?\n/)
  const headingRe = /^##\s+(.+?)\s*$/
  let i = 0
  let found = false
  for (; i < lines.length; i++) {
    const m = lines[i].match(headingRe)
    if (m && m[1].trim() === scenarioName.trim()) {
      found = true
      i += 1
      break
    }
  }
  if (!found) return null

  const tableLines = []
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (/^##\s+/.test(line) || /^___/.test(line)) break
    if (/^\s*\|/.test(line)) tableLines.push(line.trim())
    else if (tableLines.length) break
  }
  if (tableLines.length < 2) return null

  const splitRow = (line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())

  const headers = splitRow(tableLines[0])
  const rows = []
  for (let r = 1; r < tableLines.length; r++) {
    if (/^\|?\s*:?-{3,}/.test(tableLines[r])) continue
    const cells = splitRow(tableLines[r])
    if (cells.some((c) => c !== '')) rows.push(cells)
  }
  if (!headers.length || !rows.length) return null
  return { headers, rows }
}

function tableRowAt(table, rowIndex1Based) {
  if (!table?.headers?.length || !table.rows?.length) return null
  const idx = (rowIndex1Based || 1) - 1
  const cells = table.rows[idx]
  if (!cells) return null
  const tableRow = {}
  table.headers.forEach((h, j) => {
    tableRow[h] = cells[j] ?? ''
  })
  return {
    tableHeaders: [...table.headers],
    tableRow,
    tableRows: table.rows.map((row) => {
      const obj = {}
      table.headers.forEach((h, j) => {
        obj[h] = row[j] ?? ''
      })
      return obj
    }),
    rowCount: table.rows.length
  }
}

/** Collect named dynamic/static params from Gauge step parameters. */
function namedParamsFrom(params) {
  const out = {}
  for (const p of params || []) {
    if (!p || typeof p !== 'object') continue
    if (normalizeTable(p.table)) continue
    const name = p.name != null ? String(p.name).trim() : ''
    if (!name) continue
    if (p.value == null || p.value === '') continue
    if (out[name] == null) out[name] = String(p.value)
  }
  return out
}

function iconFor(status) {
  if (status === 'passed') return '✓'
  if (status === 'failed') return '✗'
  if (status === 'skipped') return '–'
  if (status === 'running') return '◌'
  return '·'
}

/**
 * Execution store: Live = current scenario only; Results = cards + detail.
 * Console is separate (stdout/stderr via console store).
 */
export const useExecutionStore = defineStore('execution', {
  state: () => ({
    running: false,
    runId: null,
    counts: { pass: 0, fail: 0, skip: 0, run: 0 },
    currentScenario: null,
    scenarioResults: [],
    selectedId: null,
    resultsFilter: 'all',
    liveFailText: '',
    // Track nesting for Concept during live events
    _stack: [],
    _currentSpec: null,
    _rowCounters: {}, // key: specPath::scenarioName -> next row index
    _activeId: null
  }),
  getters: {
    filteredResults(state) {
      if (state.resultsFilter === 'all') return state.scenarioResults
      return state.scenarioResults.filter((r) => r.status === state.resultsFilter)
    },
    selectedResult(state) {
      return state.scenarioResults.find((r) => r.id === state.selectedId) || null
    },
    failedCount(state) {
      return state.scenarioResults.filter((r) => r.status === 'failed').length
    }
  },
  actions: {
    bindEvents() {
      if (!api()) return
      api().on('execution:event', (ev) => this.handleEvent(ev))
      api().on('run:status', (s) => {
        this.running = s.state === 'running'
        if (s.runId) this.runId = s.runId
        this.recalcCounters()
      })
      api().on('run:finished', () => {
        this.running = false
        if (this.currentScenario) {
          // keep last scenario visible but mark settled if still running
          if (this.currentScenario.status === 'running') {
            this.currentScenario.status = 'passed'
            if (this._activeId) {
              this.upsertResult({ id: this._activeId, status: 'passed' })
            }
          }
        }
        this.recalcCounters()
      })
    },

    clearResults() {
      this.currentScenario = null
      this.scenarioResults = []
      this.selectedId = null
      this.liveFailText = ''
      this.counts = { pass: 0, fail: 0, skip: 0, run: 0 }
      this._stack = []
      this._currentSpec = null
      this._rowCounters = {}
      this._activeId = null
    },

    upsertResult(partial) {
      const idx = this.scenarioResults.findIndex((r) => r.id === partial.id)
      if (idx >= 0) {
        this.scenarioResults[idx] = { ...this.scenarioResults[idx], ...partial }
      } else {
        this.scenarioResults.push({ ...partial })
      }
    },

    recalcCounters() {
      let pass = 0
      let fail = 0
      let skip = 0
      let run = 0
      for (const r of this.scenarioResults) {
        if (r.status === 'passed') pass += 1
        else if (r.status === 'failed') fail += 1
        else if (r.status === 'skipped') skip += 1
        else if (r.status === 'running') run += 1
      }
      this.counts.pass = pass
      this.counts.fail = fail
      this.counts.skip = skip
      this.counts.run = run
    },

    handleEvent(ev) {
      const type = ev.type
      const payload = ev.payload || {}
      const info = infoOf(payload)
      const result = endingResult(payload, info)

      switch (type) {
        case 'ExecutionStarting':
          this._stack = []
          this._rowCounters = {}
          break
        case 'SpecExecutionStarting':
          this._currentSpec = info.currentSpec || null
          break
        case 'SpecExecutionEnding':
          break
        case 'ScenarioExecutionStarting': {
          const app = useAppStore()
          const spec = info.currentSpec || this._currentSpec || {}
          const scen = info.currentScenario || {}
          const specPath = relativizeSpecPath(spec.fileName || spec.name, app.project?.path)
          const scenName = scen.name || 'Scenario'
          // Dedupe: Gauge/reporter may emit Starting twice for the same scenario
          if (
            this.currentScenario?.status === 'running' &&
            this.currentScenario.name === scenName &&
            this.currentScenario.specPath === specPath
          ) {
            break
          }
          const key = `${specPath}::${scenName}`
          // Heuristic: repeated same scenario name => data-driven rows
          const prev = this._rowCounters[key] || 0
          this._rowCounters[key] = prev + 1
          let id
          if (this._rowCounters[key] === 1) {
            id = makeExecutionId(specPath, scenName, null)
          } else {
            // Upgrade: if first card exists without row, rename it to row1
            const firstId = makeExecutionId(specPath, scenName, null)
            const first = this.scenarioResults.find((r) => r.id === firstId)
            if (first && !first.dataDriven) {
              first.id = makeExecutionId(specPath, scenName, 1)
              first.dataDriven = true
              first.rowIndex = 1
              if (this.selectedId === firstId) this.selectedId = first.id
              if (this._activeId === firstId) this._activeId = first.id
              this._loadScenarioTable(specPath, scenName, 1, first.id)
            }
            id = makeExecutionId(specPath, scenName, this._rowCounters[key])
          }
          const dataDriven = this._rowCounters[key] > 1 || !!this.scenarioResults.find(
            (r) => r.specPath === specPath && r.name === scenName && r.dataDriven
          )
          if (dataDriven && this._rowCounters[key] === 1) {
            id = makeExecutionId(specPath, scenName, 1)
          }

          this._activeId = id
          this._stack = []
          this.liveFailText = ''
          const isDd = !!dataDriven || this._rowCounters[key] > 1
          const rowIndex = isDd || this._rowCounters[key] > 1 ? this._rowCounters[key] : null
          this.currentScenario = {
            id,
            name: scenName,
            specPath,
            specName: spec.name || specPath,
            status: 'running',
            dataDriven: isDd,
            rowIndex,
            tableHeaders: null,
            tableRow: null,
            tableRows: null,
            rowCount: null,
            steps: [],
            tags: scen.tags || []
          }
          this.upsertResult({
            id,
            name: scenName,
            specPath,
            specName: spec.name || specPath,
            status: 'running',
            dataDriven: this.currentScenario.dataDriven,
            rowIndex: this.currentScenario.rowIndex,
            tableHeaders: null,
            tableRow: null,
            tableRows: null,
            rowCount: null,
            steps: [],
            stepsDone: 0,
            stepsTotal: 0,
            duration: ''
          })
          this.counts.run = 1
          if (this.currentScenario.dataDriven && this.currentScenario.rowIndex) {
            this._loadScenarioTable(specPath, scenName, this.currentScenario.rowIndex, id)
          }
          this.recalcCounters()
          break
        }
        case 'ScenarioExecutionEnding': {
          const failed = !!result?.failed
          const skipped = !!result?.skipped
          const status = failed ? 'failed' : skipped ? 'skipped' : 'passed'
          if (this.currentScenario) {
            this.currentScenario.status = status
            if (result?.errorMessage) this.liveFailText = result.errorMessage
          }
          if (this._activeId) {
            this.upsertResult({
              id: this._activeId,
              status,
              steps: this.currentScenario?.steps ? JSON.parse(JSON.stringify(this.currentScenario.steps)) : [],
              duration: result?.executionTime != null ? `${result.executionTime}ms` : ''
            })
          }
          this.recalcCounters()
          break
        }
        case 'ConceptExecutionStarting': {
          const step = info.currentStep || {}
          const labeled = this._stepLabel(step)
          const top = this._stack[this._stack.length - 1]
          if (top?.kind === 'concept' && top.text === labeled.text && top.status === 'running') break
          this._mergeRowParams(stepRequestOf(step)?.parameters)
          const node = {
            kind: 'concept',
            text: labeled.text,
            tables: labeled.tables,
            status: 'running',
            children: [],
            ms: null,
            error: null
          }
          this._pushLiveNode(node)
          this._stack.push(node)
          break
        }
        case 'ConceptExecutionEnding': {
          const node = this._stack.length && this._stack[this._stack.length - 1]?.kind === 'concept'
            ? this._stack.pop()
            : null
          if (node) {
            const failed = !!result?.failed
            node.status = failed ? 'failed' : result?.skipped ? 'skipped' : 'passed'
            node.ms = result?.executionTime ?? null
            this._applyEndingLabel(node, result, info)
            if (result?.errorMessage) {
              node.error = [result.errorMessage, result.stackTrace].filter(Boolean).join('\n')
              this.liveFailText = node.error
            }
          }
          this._syncResultSteps()
          break
        }
        case 'StepExecutionStarting': {
          const step = info.currentStep || {}
          const labeled = this._stepLabel(step)
          const top = this._stack[this._stack.length - 1]
          if (top?.kind === 'step' && top.text === labeled.text && top.status === 'running') break
          this._mergeRowParams(stepRequestOf(step)?.parameters)
          const node = {
            kind: 'step',
            text: labeled.text,
            tables: labeled.tables,
            status: 'running',
            ms: null,
            error: null
          }
          this._pushLiveNode(node)
          this._stack.push(node)
          break
        }
        case 'StepExecutionEnding': {
          let node = null
          if (this._stack.length && this._stack[this._stack.length - 1]?.kind === 'step') {
            node = this._stack.pop()
          }
          if (node) {
            const failed = !!result?.failed
            node.status = failed ? 'failed' : result?.skipped ? 'skipped' : 'passed'
            node.ms = result?.executionTime ?? null
            this._applyEndingLabel(node, result, info)
            if (result?.errorMessage) {
              node.error = [result.errorMessage, result.stackTrace].filter(Boolean).join('\n')
              this.liveFailText = node.error
            }
          }
          this._syncResultSteps()
          break
        }
        case 'ExecutionEnding':
        case 'SuiteResult':
          this.recalcCounters()
          break
        default:
          break
      }
    },

    _guessDataDriven() {
      return false
    },

    async _loadScenarioTable(specPath, scenName, rowIndex, resultId) {
      try {
        const bridge = api()
        if (!bridge?.spec?.read || !specPath) return
        const file = await bridge.spec.read(specPath)
        const table = parseScenarioDataTable(file?.content, scenName)
        const packed = tableRowAt(table, rowIndex)
        if (!packed) return
        if (this.currentScenario?.id === resultId) {
          Object.assign(this.currentScenario, packed)
        }
        this.upsertResult({ id: resultId, ...packed, dataDriven: true, rowIndex })
      } catch {
        /* ignore parse/read errors */
      }
    },

    _mergeRowParams(params) {
      const named = namedParamsFrom(params)
      const keys = Object.keys(named)
      if (!keys.length) return
      const target =
        this.currentScenario?.id === this._activeId ? this.currentScenario : null
      const result = this.scenarioResults.find((r) => r.id === this._activeId)
      if (!target && !result) return
      if (!target?.dataDriven && !result?.dataDriven) return

      const headers = [...(result?.tableHeaders || target?.tableHeaders || [])]
      const tableRow = { ...(result?.tableRow || target?.tableRow || {}) }
      for (const k of keys) {
        if (tableRow[k] == null || tableRow[k] === '') tableRow[k] = named[k]
        if (!headers.includes(k)) headers.push(k)
      }
      const patch = {
        tableHeaders: headers,
        tableRow,
        dataDriven: true,
        rowIndex: result?.rowIndex || target?.rowIndex || null
      }
      if (target) Object.assign(target, patch)
      if (this._activeId) this.upsertResult({ id: this._activeId, ...patch })
    },

    _stepLabel(stepInfo) {
      const req = stepRequestOf(stepInfo)
      if (!req && !stepInfo) return { text: '(unnamed step)', tables: [] }
      const rawParams = req?.parameters || stepInfo?.params || []
      const rawText =
        req?.actualStepText ||
        req?.actual_step_text ||
        req?.parsedStepText ||
        req?.parsed_step_text ||
        stepInfo?.stepText ||
        stepInfo?.actualText ||
        stepInfo?.name ||
        ''
      const labeled = applyParams(rawText, rawParams)
      return {
        text: labeled.text || '(unnamed step)',
        tables: labeled.tables
      }
    },

    _applyEndingLabel(node, result, info) {
      const params = stepRequestOf(info.currentStep)?.parameters || []
      if (result?.displayText) {
        const labeled = applyParams(result.displayText, params)
        if (labeled.text) node.text = labeled.text
        if (labeled.tables?.length) node.tables = labeled.tables
        else if (result.tables?.length) node.tables = result.tables
      } else {
        const refreshed = this._stepLabel(info.currentStep)
        if (refreshed.text) node.text = refreshed.text
        if (refreshed.tables?.length) node.tables = refreshed.tables
      }
      // Ensure tables from params even if text had no placeholder
      if (!node.tables?.length) {
        const fromParams = extractTablesFromParams(params)
        if (fromParams.length) node.tables = fromParams
      }
    },

    _pushLiveNode(node) {
      if (!this.currentScenario) return
      const parent = this._stack.length
        ? this._stack[this._stack.length - 1]
        : null
      if (parent && parent.kind === 'concept') {
        parent.children.push(node)
      } else {
        this.currentScenario.steps.push(node)
      }
      this._syncResultSteps()
    },

    _syncResultSteps() {
      if (!this._activeId || !this.currentScenario) return
      const steps = JSON.parse(JSON.stringify(this.currentScenario.steps))
      this.upsertResult({
        id: this._activeId,
        steps,
        stepsDone: countLeaves(steps),
        stepsTotal: countLeaves(steps),
        conceptCount: countConcepts(steps)
      })
    },

    selectResult(id) {
      this.selectedId = this.selectedId === id ? null : id
    },

    closeDetail() {
      this.selectedId = null
    },

    async startRun() {
      const app = useAppStore()
      const specs = app.checkedSpecs.map((s) => s.path)
      if (!specs.length) {
        app.showToast('请至少勾选一个 Spec')
        return
      }
      if (!app.project) {
        app.showToast('请先打开项目')
        return
      }
      this.clearResults()
      app.setPage('live')
      try {
        await api().run.start({ specs, tags: app.tags })
      } catch (err) {
        app.showToast(err.message || '启动失败')
      }
    },

    async stopRun() {
      await api().run.stop()
      if (this.currentScenario?.status === 'running') {
        this.currentScenario.status = 'failed'
      }
      for (const r of this.scenarioResults) {
        if (r.status === 'running') r.status = 'failed'
      }
      this.running = false
      this.recalcCounters()
    },

    async retryFailed() {
      const app = useAppStore()
      const failed = this.scenarioResults.filter((r) => r.status === 'failed')
      if (!failed.length) {
        app.showToast('没有失败的 Scenario')
        return
      }
      const jobs = failed.map((r) => this._jobFromResult(r, app.tags))
      app.setPage('live')
      try {
        await api().run.retryFailed(jobs)
      } catch (err) {
        app.showToast(err.message || '重试失败')
      }
    },

    async retrySelected() {
      const app = useAppStore()
      const cur = this.selectedResult
      if (!cur) return
      const job = this._jobFromResult(cur, app.tags)
      job.label = cur.dataDriven ? `重试行 ${cur.rowIndex}` : '重试中'
      app.setPage('live')
      try {
        await api().run.retryOne(job)
      } catch (err) {
        app.showToast(err.message || '重试失败')
      }
    },

    _jobFromResult(r, tags) {
      return {
        specs: [r.specPath],
        tags: tags || '',
        tableRows: r.dataDriven && r.rowIndex ? r.rowIndex : null,
        scenarioName: r.name,
        executionId: r.id
      }
    },

    iconFor
  }
})
