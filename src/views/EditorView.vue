<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { RefreshRight } from '@element-plus/icons-vue'
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

const lspBadgeType = computed(() => {
  if (editor.lspRestarting) return 'warning'
  if (app.lsp.status === 'offline') return 'danger'
  return 'success'
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
  <div class="gs-panel">
    <div class="gs-panel-header">
      <div class="editor-heading">
        <h2>Spec 编辑</h2>
        <span class="editor-path">{{ editor.path || '从左侧双击 .spec 文件打开' }}</span>
      </div>
      <el-space>
        <el-button :disabled="!editor.dirty" @click="editor.revert()">还原</el-button>
        <el-button type="primary" :disabled="!editor.path || !editor.dirty" @click="editor.save()">
          保存
        </el-button>
      </el-space>
    </div>

    <div class="editor-body">
      <div class="editor-surface">
        <div class="line-gutter" aria-hidden="true">
          <div v-for="n in lineNumbers" :key="n" class="line-no">{{ n }}</div>
        </div>
        <textarea
          ref="ta"
          class="spec-textarea"
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
            <el-tag size="small" type="success" effect="plain">{{ item.kind || 'Concept' }}</el-tag>
            <span>
              <div class="lsp-label">{{ item.label }}</div>
              <div class="lsp-detail">{{ item.detail }}</div>
            </span>
          </button>
        </div>
      </div>
      <div class="editor-status">
        <el-space :size="16">
          <span :class="editor.dirty ? 'dirty' : ''">{{ editor.dirty ? '未保存' : '未修改' }}</span>
          <span>行 {{ editor.cursor.line }}，列 {{ editor.cursor.col }}</span>
          <span>{{ editor.lineCount }} 行</span>
        </el-space>
        <el-space>
          <el-tag :type="lspBadgeType" effect="light" round>{{ lspBadgeText }}</el-tag>
          <el-button
            :icon="RefreshRight"
            :disabled="editor.lspRestarting"
            :loading="editor.lspRestarting"
            title="重启 Gauge LSP 服务"
            @click="editor.restartLsp()"
          >
            重启LSP
          </el-button>
        </el-space>
      </div>
    </div>
  </div>
</template>
