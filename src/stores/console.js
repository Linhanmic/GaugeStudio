import { defineStore } from 'pinia'

const api = () => window.gaugeStudio

export const useConsoleStore = defineStore('console', {
  state: () => ({
    entries: [],
    maxEntries: 8000
  }),
  getters: {
    isEmpty: (s) => !s.entries.length
  },
  actions: {
    bindEvents() {
      if (!api()) return
      api().on('console:data', ({ text, stream }) => {
        this.append(text || '', stream === 'stderr' ? 'err' : '')
      })
    },
    append(text, kind = '') {
      const parts = String(text).split(/\r?\n/)
      // Keep trailing incomplete line behavior: join with previous if needed
      for (let i = 0; i < parts.length; i++) {
        const line = parts[i]
        const isLast = i === parts.length - 1
        if (isLast && line === '' && parts.length > 1) continue
        if (!isLast || line !== '' || parts.length === 1) {
          let k = kind
          if (!k) {
            if (/error|failed|FAIL/i.test(line)) k = 'err'
            else if (/warn/i.test(line)) k = 'warn'
            else if (/✔|✓|PASS|Success/i.test(line)) k = 'ok'
            else if (/^#|Specifications|Scenarios/i.test(line)) k = 'head'
          }
          this.entries.push({ text: line, kind: k })
        }
      }
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(-this.maxEntries)
      }
    },
    clear() {
      this.entries = []
    }
  }
})
