import { defineStore } from 'pinia'
import { useAppStore } from './app.js'

const api = () => window.gaugeStudio

export const useEditorStore = defineStore('editor', {
  state: () => ({
    path: '',
    content: '',
    savedContent: '',
    cursor: { line: 1, col: 1 },
    lspItems: [],
    lspIndex: 0,
    lspOpen: false,
    lspRestarting: false
  }),
  getters: {
    dirty(state) {
      return state.path && state.content !== state.savedContent
    },
    lineCount(state) {
      return (state.content || '').split(/\n/).length
    }
  },
  actions: {
    async openSpec(relPath) {
      const app = useAppStore()
      try {
        const { path, content } = await api().spec.read(relPath)
        this.path = path
        this.content = content
        this.savedContent = content
        this.lspOpen = false
        app.setPage('editor')
      } catch (err) {
        app.showToast(err.message || '读取 Spec 失败')
      }
    },
    async save() {
      const app = useAppStore()
      if (!this.path) return
      try {
        await api().spec.write(this.path, this.content)
        this.savedContent = this.content
        app.showToast('已保存')
      } catch (err) {
        app.showToast(err.message || '保存失败')
      }
    },
    revert() {
      this.content = this.savedContent
      this.lspOpen = false
    },
    updateCursor(line, col) {
      this.cursor = { line, col }
    },
    async refreshCompletions(lineText, force = false) {
      if (!this.path) return
      const res = await api().lsp.complete({
        path: this.path,
        line: this.cursor.line - 1,
        character: this.cursor.col - 1,
        lineText,
        force
      })
      this.lspItems = res.items || []
      this.lspIndex = 0
      this.lspOpen = this.lspItems.length > 0
      if (res.status) {
        useAppStore().lsp = {
          ...useAppStore().lsp,
          status: res.status,
          conceptCount: this.lspItems.length
        }
      }
    },
    hideCompletions() {
      this.lspOpen = false
      this.lspItems = []
    },
    applyCompletion(index, textareaValue, selectionStart) {
      const item = this.lspItems[index]
      if (!item) return textareaValue
      const before = textareaValue.slice(0, selectionStart)
      const after = textareaValue.slice(selectionStart)
      const lineStart = before.lastIndexOf('\n') + 1
      const line = before.slice(lineStart)
      const starMatch = line.match(/^(\s*\*\s*)(.*)$/)
      let newBefore
      if (starMatch) {
        newBefore = before.slice(0, lineStart) + starMatch[1] + item.insertText
      } else {
        newBefore = before + item.insertText
      }
      this.content = newBefore + after
      this.hideCompletions()
      return { content: this.content, caret: newBefore.length }
    },
    async restartLsp() {
      const app = useAppStore()
      this.lspRestarting = true
      try {
        const st = await api().lsp.restart()
        app.lsp = st
        app.showToast('LSP 已重启')
      } catch (err) {
        app.showToast(err.message || 'LSP 重启失败')
      } finally {
        this.lspRestarting = false
      }
    }
  }
})
