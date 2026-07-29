import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

/**
 * Thin Gauge LSP bridge for CPT Concept completion.
 *
 * Strategy:
 * 1. Prefer parsing project .cpt files for Concept headings (fast, reliable MVP).
 * 2. Optionally keep a `gauge --lsp` child alive for future full LSP;
 *    restart via lsp:restart. Full textDocument/completion over stdio
 *    JSON-RPC is stubbed for later hardening.
 */
export class LspService {
  constructor({ getSettings, getProject, send }) {
    this.getSettings = getSettings
    this.getProject = getProject
    this.send = send
    this.process = null
    this.status = 'offline'
    this.concepts = []
  }

  getStatus() {
    return {
      status: this.status,
      conceptCount: this.concepts.length,
      pid: this.process?.pid || null
    }
  }

  async start() {
    await this.refreshConcepts()
    // Best-effort spawn gauge --lsp (may not speak completion yet)
    await this.#spawnLspProcess()
    this.status = this.concepts.length ? 'ready' : this.process ? 'ready' : 'offline'
    this.send?.('lsp:status', this.getStatus())
    return this.getStatus()
  }

  async restart() {
    await this.stop()
    return this.start()
  }

  async stop() {
    if (this.process) {
      const child = this.process
      this.process = null
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            shell: true
          })
        } else {
          child.kill('SIGTERM')
        }
      } catch {
        /* ignore */
      }
    }
    this.status = 'offline'
    this.send?.('lsp:status', this.getStatus())
  }

  async refreshConcepts() {
    const project = this.getProject()
    this.concepts = []
    if (!project?.path) return this.concepts

    if (project.concepts?.length) {
      for (const c of project.concepts) {
        for (const heading of c.headings || []) {
          this.concepts.push({
            label: heading,
            detail: c.path,
            kind: 'concept',
            insertText: heading
          })
        }
      }
    }

    // Also re-scan in case project.concepts is stale after edits
    if (!this.concepts.length) {
      await this.#scanCpt(project.path)
    }
    return this.concepts
  }

  /**
   * Completion for Spec step lines. Filters CPT Concept headings by prefix.
   * @param {{ path?: string, line: number, character: number, lineText: string, prefix?: string }} params
   */
  async complete(params = {}) {
    await this.refreshConcepts()
    const lineText = params.lineText || ''
    const trimmed = lineText.trimStart()
    // Only suggest on step lines (* ...)
    if (!trimmed.startsWith('*') && !params.force) {
      return { items: [], status: this.status }
    }
    const afterStar = trimmed.replace(/^\*\s*/, '')
    const prefix = (params.prefix ?? afterStar).toLowerCase()

    const items = this.concepts
      .filter((c) => !prefix || c.label.toLowerCase().includes(prefix))
      .slice(0, 40)
      .map((c) => ({
        label: c.label,
        kind: 'Concept',
        detail: c.detail || 'CPT',
        insertText: c.insertText || c.label
      }))

    return { items, status: this.status }
  }

  async #spawnLspProcess() {
    if (this.process) return
    const settings = this.getSettings()
    const project = this.getProject()
    const gaugeBin = settings.gaugePath?.trim() || 'gauge'
    try {
      const child = spawn(gaugeBin, ['--lsp'], {
        cwd: project?.path || process.cwd(),
        env: process.env,
        shell: process.platform === 'win32',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      this.process = child
      child.on('error', () => {
        this.process = null
        this.status = this.concepts.length ? 'ready' : 'offline'
        this.send?.('lsp:status', this.getStatus())
      })
      child.on('close', () => {
        this.process = null
        this.status = this.concepts.length ? 'ready' : 'offline'
        this.send?.('lsp:status', this.getStatus())
      })
      // Swallow LSP stdout for now (JSON-RPC handshake stub)
      child.stdout?.on('data', () => {})
      child.stderr?.on('data', () => {})
      this.status = 'ready'
    } catch {
      this.process = null
      this.status = this.concepts.length ? 'ready' : 'offline'
    }
  }

  async #scanCpt(root) {
    async function walk(dir, out) {
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          if (['node_modules', '.git', 'reports', 'logs'].includes(ent.name)) continue
          await walk(full, out)
        } else if (ent.name.endsWith('.cpt')) {
          const content = await fs.readFile(full, 'utf8')
          const rel = path.relative(root, full).replace(/\\/g, '/')
          for (const line of content.split(/\r?\n/)) {
            const m = line.match(/^#\s+(.+)$/)
            if (m) {
              out.push({
                label: m[1].trim(),
                detail: rel,
                kind: 'concept',
                insertText: m[1].trim()
              })
            }
          }
        }
      }
    }
    const out = []
    await walk(root, out)
    this.concepts = out
  }
}
