import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import router from '../router/index.js'

const api = () => window.gaugeStudio

function collectSpecFlags(node, flag) {
  const set = new Set()
  function walk(n) {
    if (!n) return
    if (flag === 'checked' && n.type === 'spec' && n.checked) set.add(n.path)
    if (flag === 'expanded' && n.type === 'folder' && n.expanded) set.add(n.path)
    ;(n.children || []).forEach(walk)
  }
  walk(node)
  return set
}

function restoreSpecFlags(node, set, flag) {
  if (!node || !set?.size) return
  function walk(n) {
    if (!n) return
    if (flag === 'checked' && n.type === 'spec') n.checked = set.has(n.path)
    if (flag === 'expanded' && n.type === 'folder') n.expanded = set.has(n.path)
    ;(n.children || []).forEach(walk)
  }
  walk(node)
}

export const useAppStore = defineStore('app', {
  state: () => ({
    tags: '通用',
    settings: { ...DEFAULT_SETTINGS },
    settingsOpen: false,
    settingsPanel: 'general',
    project: null,
    wsClients: 0,
    wsPort: 8080,
    status: { state: 'idle', text: '就绪' },
    lsp: { status: 'offline', conceptCount: 0 }
  }),
  getters: {
    checkedSpecs(state) {
      const out = []
      function walk(node) {
        if (!node) return
        if (node.type === 'spec' && node.checked) out.push(node)
        ;(node.children || []).forEach(walk)
      }
      walk(state.project?.specsTree)
      return out
    },
    envs(state) {
      return state.project?.envs?.length ? state.project.envs : ['default']
    }
  },
  actions: {
    async init() {
      if (!api()) return
      this.settings = await api().settings.get()
      this.wsPort = this.settings.wsPort || 8080
      api().on('run:status', (s) => {
        this.status = { state: s.state, text: s.text }
        if (s.wsPort) this.wsPort = s.wsPort
      })
      api().on('ws:connection', (c) => {
        this.wsClients = c.clients || 0
        if (c.port) this.wsPort = c.port
      })
      api().on('lsp:status', (s) => {
        this.lsp = s
      })
      if (this.settings.lastProjectPath) {
        try {
          await this.openProject(this.settings.lastProjectPath)
        } catch {
          /* ignore stale path */
        }
      }
    },
    showToast(msg) {
      const text = String(msg || '')
      let type = 'info'
      if (/失败|未就绪/.test(text)) type = 'error'
      else if (/警告|请/.test(text)) type = 'warning'
      else if (/已/.test(text)) type = 'success'
      ElMessage({ message: text, type, duration: 2400 })
    },
    goPage(name) {
      if (!name || router.currentRoute.value.name === name) return
      router.push({ name })
    },
    async saveSettings(partial) {
      this.settings = await api().settings.save(partial)
      this.wsPort = this.settings.wsPort || 8080
      this.settingsOpen = false
      this.showToast('设置已保存（userData）')
    },
    async openProject(path, { quiet = false, preserveChecked = null, preserveExpanded = null } = {}) {
      const bridge = api()
      if (!bridge?.project) {
        this.showToast('Electron API 未就绪（preload 失败）')
        return null
      }
      try {
        const project = await bridge.project.open(path || undefined)
        if (!project) return null
        if (preserveChecked?.size) {
          restoreSpecFlags(project.specsTree, preserveChecked, 'checked')
        }
        if (preserveExpanded?.size) {
          restoreSpecFlags(project.specsTree, preserveExpanded, 'expanded')
        }
        this.project = project
        if (!quiet) {
          if (!project.hasStudioReporter) {
            this.showToast('警告：manifest 未声明 studio-reporter')
          } else {
            this.showToast(`已打开 ${project.name}`)
          }
        }
        const st = await bridge.lsp.status()
        this.lsp = st
        return project
      } catch (err) {
        this.showToast(`打开失败：${err?.message || err}`)
        throw err
      }
    },
    async pickAndOpenProject() {
      const bridge = api()
      if (!bridge?.project) {
        this.showToast('Electron API 未就绪（preload 失败）')
        return
      }
      try {
        const path = await bridge.project.pick()
        if (!path) return
        return await this.openProject(path)
      } catch (err) {
        this.showToast(`打开失败：${err?.message || err}`)
      }
    },
    async refreshProject() {
      if (!this.project?.path) {
        this.showToast('请先打开项目')
        return
      }
      const checked = collectSpecFlags(this.project.specsTree, 'checked')
      const expanded = collectSpecFlags(this.project.specsTree, 'expanded')
      try {
        await this.openProject(this.project.path, {
          quiet: true,
          preserveChecked: checked,
          preserveExpanded: expanded
        })
        this.showToast('项目已刷新')
      } catch (err) {
        this.showToast(`刷新失败：${err?.message || err}`)
      }
    },
    setExpandedRecursive(node, expanded) {
      if (!node || node.type !== 'folder') return
      node.expanded = expanded
      ;(node.children || []).forEach((c) => this.setExpandedRecursive(c, expanded))
    },
    expandAll() {
      if (!this.project?.specsTree) return
      this.setExpandedRecursive(this.project.specsTree, true)
    },
    collapseAll() {
      if (!this.project?.specsTree) return
      this.setExpandedRecursive(this.project.specsTree, false)
      this.project.specsTree.expanded = true
    },
    toggleFolder(node) {
      node.expanded = !node.expanded
    },
    setSpecChecked(node, checked) {
      if (!node || node.type !== 'spec') return
      node.checked = !!checked
    },
    setFolderChecked(node, checked) {
      if (!node) return
      const on = !!checked
      function walk(n) {
        if (!n) return
        if (n.type === 'folder') {
          // Expand so cascaded selection is visible under nested dirs
          if (on) n.expanded = true
          ;(n.children || []).forEach(walk)
          return
        }
        if (n.type === 'spec') n.checked = on
      }
      walk(node)
    }
  }
})
