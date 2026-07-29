<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useEditorStore } from '../stores/editor.js'
import { useAppStore } from '../stores/app.js'

const editor = useEditorStore()
const app = useAppStore()
const ta = ref(null)
const lspBox = ref(null)

const lineNumbers = computed(() => {
  const n = editor.lineCount
  return Array.from({ length: n }, (_, i) => i + 1)
})

const lspBadgeClass = computed(() => {
  if (editor.lspRestarting) return 'restarting'
  if (app.lsp.status === 'offline') return 'offline'
  return ''
})

const lspBadgeText = computed(() => {
  if (editor.lspRestarting) return 'LSP · 重启中…'
  if (app.lsp.status === 'offline') return 'LSP · 离线（CPT 扫描仍可用）'
  return `LSP · ${app.lsp.conceptCount || 0} Concepts`
})

function syncCursor() {
  const el = ta.value
  if (!el) return
  const pos = el.selectionStart
  const before = el.value.slice(0, pos)
  const lines = before.split('\n')
  editor.updateCursor(lines.length, lines[lines.length - 1].length + 1)
}

function currentLineText() {
  const el = ta.value
  if (!el) return ''
  const pos = el.selectionStart
  const before = el.value.slice(0, pos)
  const lineStart = before.lastIndexOf('\n') + 1
  const after = el.value.slice(pos)
  const lineEndRel = after.indexOf('\n')
  const lineEnd = lineEndRel < 0 ? el.value.length : pos + lineEndRel
  return el.value.slice(lineStart, lineEnd)
}

async function onInput() {
  editor.content = ta.value.value
  syncCursor()
  await editor.refreshCompletions(currentLineText())
  await positionLsp()
}

async function positionLsp() {
  await nextTick()
  const el = ta.value
  const box = lspBox.value
  if (!el || !box || !editor.lspOpen) return
  // Approximate caret position near top of textarea
  box.style.left = '56px'
  box.style.top = `${Math.min(el.scrollTop + 40, 200)}px`
}

async function onKeydown(e) {
  if (editor.lspOpen && editor.lspItems.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      editor.lspIndex = (editor.lspIndex + 1) % editor.lspItems.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      editor.lspIndex = (editor.lspIndex - 1 + editor.lspItems.length) % editor.lspItems.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      applyLsp(editor.lspIndex)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      editor.hideCompletions()
      return
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
    e.preventDefault()
    await editor.refreshCompletions(currentLineText(), true)
    await positionLsp()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    await editor.save()
    return
  }
  if (e.key === 'Tab' && !editor.lspOpen) {
    e.preventDefault()
    const el = ta.value
    const start = el.selectionStart
    const end = el.selectionEnd
    el.value = el.value.slice(0, start) + '  ' + el.value.slice(end)
    el.selectionStart = el.selectionEnd = start + 2
    editor.content = el.value
  }
}

function applyLsp(index) {
  const el = ta.value
  const result = editor.applyCompletion(index, el.value, el.selectionStart)
  if (!result) return
  el.value = result.content
  editor.content = result.content
  nextTick(() => {
    el.selectionStart = el.selectionEnd = result.caret
    el.focus()
  })
}

watch(
  () => editor.content,
  async () => {
    await nextTick()
    if (ta.value && ta.value.value !== editor.content) {
      ta.value.value = editor.content
    }
  }
)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div class="flex flex-col gap-0.5 min-w-0">
        <h2>Spec 编辑</h2>
        <span class="font-mono text-[11px] text-[var(--text-muted)] font-medium normal-case tracking-normal truncate">
          {{ editor.path || '从左侧双击 .spec 文件打开' }}
        </span>
      </div>
      <div class="flex gap-2">
        <button class="btn-ghost !py-1 !px-2.5 text-xs" type="button" :disabled="!editor.dirty" @click="editor.revert()">
          还原
        </button>
        <button class="btn-run !py-1 !px-3 text-xs" type="button" :disabled="!editor.path || !editor.dirty" @click="editor.save()">
          保存
        </button>
      </div>
    </div>

    <div class="flex-1 flex flex-col min-h-0">
      <div class="flex-1 flex min-h-0 relative border-t border-[var(--border-soft)]">
        <div
          class="w-12 bg-[var(--bg-inset)] border-r border-[var(--border-soft)] py-3 overflow-hidden font-mono text-[13px] leading-[1.6] text-[var(--text-faint)] text-right select-none flex-shrink-0"
          aria-hidden="true"
        >
          <div v-for="n in lineNumbers" :key="n" class="px-2">{{ n }}</div>
        </div>
        <textarea
          ref="ta"
          class="flex-1 p-3 font-mono text-[13px] leading-[1.6] text-[var(--text)] bg-[var(--bg-elevated)] border-none outline-none resize-none tab-[2] whitespace-pre-wrap overflow-auto min-h-0"
          spellcheck="false"
          :value="editor.content"
          placeholder="双击左侧 .spec 打开文件；步骤行输入 * 可触发 CPT Concept 补全。"
          @input="onInput"
          @click="syncCursor(); editor.refreshCompletions(currentLineText())"
          @keyup="syncCursor()"
          @keydown="onKeydown"
          @scroll="positionLsp"
        />
        <div ref="lspBox" class="lsp-complete" :class="{ open: editor.lspOpen }" role="listbox">
          <div class="lsp-complete-head">Gauge LSP · Concept</div>
          <button
            v-for="(item, i) in editor.lspItems"
            :key="item.label + i"
            type="button"
            class="lsp-item"
            :class="{ active: i === editor.lspIndex }"
            @mousedown.prevent="applyLsp(i)"
          >
            <span class="lsp-kind">{{ item.kind || 'Concept' }}</span>
            <span>
              <div class="lsp-label">{{ item.label }}</div>
              <div class="lsp-detail">{{ item.detail }}</div>
            </span>
          </button>
        </div>
      </div>
      <div
        class="flex items-center justify-between px-3 py-2 border-t border-[var(--border-soft)] bg-[var(--bg-panel)] text-[11px] text-[var(--text-muted)]"
      >
        <div class="flex gap-4">
          <span :class="editor.dirty ? 'text-[var(--skip)] font-semibold' : ''">
            {{ editor.dirty ? '未保存' : '未修改' }}
          </span>
          <span>行 {{ editor.cursor.line }}，列 {{ editor.cursor.col }}</span>
          <span>{{ editor.lineCount }} 行</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="lsp-badge" :class="lspBadgeClass">{{ lspBadgeText }}</span>
          <button
            type="button"
            class="btn-ghost !py-0.5 !px-2.5 text-[11px]"
            :disabled="editor.lspRestarting"
            title="重启 Gauge LSP 服务"
            @click="editor.restartLsp()"
          >
            重启LSP
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
