import { spawn } from 'child_process'
import path from 'path'
import { randomUUID } from 'crypto'

/**
 * Spawn gauge run with GAUGE_STUDIO_WS; support job queue for
 * full run / retry failed / retry one (with --table-rows).
 */
export class RunManager {
  constructor({ wsServer, getSettings, getProject, send }) {
    this.wsServer = wsServer
    this.getSettings = getSettings
    this.getProject = getProject
    this.send = send
    this.process = null
    this.runId = null
    this.queue = []
    this.busy = false
    this.stopping = false
  }

  isRunning() {
    return !!this.process || this.busy
  }

  /**
   * @param {object} opts
   * @param {string[]} opts.specs - relative spec paths
   * @param {string} [opts.tags]
   * @param {number} [opts.tableRows] - 1-based row for data-driven retry
   * @param {string} [opts.label]
   */
  async start(opts = {}) {
    if (this.isRunning()) {
      throw new Error('已有运行进行中')
    }
    const project = this.getProject()
    if (!project?.path) throw new Error('未打开项目')
    const specs = opts.specs || []
    if (!specs.length) throw new Error('请至少勾选一个 Spec')

    this.queue = [
      {
        specs,
        tags: opts.tags ?? '',
        tableRows: opts.tableRows ?? null,
        label: opts.label || '执行中',
        scenarioName: opts.scenarioName || null,
        executionId: opts.executionId || null
      }
    ]
    return this.#drainQueue()
  }

  /**
   * Retry multiple failed execution items sequentially.
   * Each item: { specs: [path], tableRows?, scenarioName?, executionId }
   */
  async retryJobs(jobs, label = '重试中') {
    if (this.isRunning()) throw new Error('已有运行进行中')
    if (!jobs?.length) throw new Error('没有可重试的项')
    this.queue = jobs.map((j) => ({
      specs: j.specs,
      tags: j.tags ?? '',
      tableRows: j.tableRows ?? null,
      label,
      scenarioName: j.scenarioName || null,
      executionId: j.executionId || null
    }))
    return this.#drainQueue()
  }

  async stop() {
    this.stopping = true
    this.queue = []
    const child = this.process
    if (!child) {
      this.busy = false
      this.stopping = false
      this.send('run:status', { state: 'idle', text: '已中止', runId: this.runId })
      return { ok: true }
    }
    await this.#killProcessTree(child)
    this.process = null
    this.busy = false
    this.stopping = false
    this.send('run:status', {
      state: 'failed',
      text: '已中止',
      runId: this.runId,
      aborted: true
    })
    this.send('console:data', { stream: 'stderr', text: 'Process terminated by user.\n' })
    return { ok: true }
  }

  async #drainQueue() {
    this.busy = true
    let lastResult = null
    while (this.queue.length && !this.stopping) {
      const job = this.queue.shift()
      lastResult = await this.#runOne(job)
    }
    this.busy = false
    this.stopping = false
    return lastResult
  }

  async #runOne(job) {
    const settings = this.getSettings()
    const project = this.getProject()
    const preferredPort = Number(settings.wsPort) || 0

    let wsInfo
    try {
      wsInfo = await this.wsServer.start(preferredPort)
    } catch (err) {
      // Port busy — fall back to ephemeral
      wsInfo = await this.wsServer.start(0)
    }

    this.runId = randomUUID()
    this.wsServer.setRunId(this.runId)

    const args = this.#buildArgs(settings, job)
    const gaugeBin = settings.gaugePath?.trim() || 'gauge'
    const env = {
      ...process.env,
      GAUGE_STUDIO_WS: wsInfo.url
    }

    this.send('run:status', {
      state: 'running',
      text: job.label || '执行中',
      runId: this.runId,
      wsPort: wsInfo.port,
      command: [gaugeBin, ...args].join(' '),
      executionId: job.executionId || null
    })
    this.send('console:data', {
      stream: 'meta',
      text: `$ ${gaugeBin} ${args.join(' ')}\n`
    })
    this.send('console:data', {
      stream: 'meta',
      text: `GAUGE_STUDIO_WS=${wsInfo.url}\n`
    })

    const exitCode = await new Promise((resolve) => {
      const child = spawn(gaugeBin, args, {
        cwd: project.path,
        env,
        shell: process.platform === 'win32',
        windowsHide: true
      })
      this.process = child

      child.stdout?.on('data', (buf) => {
        this.send('console:data', { stream: 'stdout', text: buf.toString() })
      })
      child.stderr?.on('data', (buf) => {
        this.send('console:data', { stream: 'stderr', text: buf.toString() })
      })
      child.on('error', (err) => {
        this.send('console:data', {
          stream: 'stderr',
          text: `Failed to start gauge: ${err.message}\n`
        })
        this.process = null
        resolve(-1)
      })
      child.on('close', (code) => {
        this.process = null
        resolve(code ?? 0)
      })
    })

    const finished = {
      runId: this.runId,
      exitCode,
      aborted: this.stopping,
      executionId: job.executionId || null
    }
    this.send('run:finished', finished)

    const state =
      this.stopping || exitCode === null
        ? 'failed'
        : exitCode === 0
          ? 'passed'
          : 'failed'
    this.send('run:status', {
      state: this.queue.length && !this.stopping ? 'running' : state,
      text:
        this.queue.length && !this.stopping
          ? job.label || '执行中'
          : exitCode === 0
            ? '全部通过'
            : this.stopping
              ? '已中止'
              : '执行失败',
      runId: this.runId,
      exitCode
    })

    return finished
  }

  #buildArgs(settings, job) {
    const args = ['run', ...job.specs]
    const tags = (job.tags || '').trim()
    if (tags) {
      args.push('--tags', tags)
    }
    const envName = settings.defaultEnv || 'default'
    if (envName && envName !== 'default') {
      args.push('--env', envName)
    }
    if (settings.parallel) {
      args.push('--parallel')
      if (settings.streams > 0) args.push(`-n=${settings.streams}`)
      if (settings.strategy) args.push(`--strategy=${settings.strategy}`)
    }
    if (settings.verbose) args.push('--verbose')
    if (settings.failSafe) args.push('--fail-safe')
    if (settings.hideSuggestion) args.push('--hide-suggestion')
    if (settings.machineReadable) args.push('--machine-readable')
    if (settings.sort) args.push('--sort')
    if (settings.simpleConsole) args.push('--simple-console')
    if (settings.maxRetries > 0) args.push(`--max-retries-count=${settings.maxRetries}`)
    if (settings.logLevel && settings.logLevel !== 'info') {
      args.push(`--log-level=${settings.logLevel}`)
    }
    // Internal: data-driven single-row retry (hidden from UI config)
    if (job.tableRows != null && job.tableRows > 0) {
      args.push(`--table-rows=${job.tableRows}`)
    }
    if (settings.extraArgs) {
      const extra = settings.extraArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || []
      for (const part of extra) {
        args.push(part.replace(/^"|"$/g, ''))
      }
    }
    return args
  }

  async #killProcessTree(child) {
    if (!child?.pid) return
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          shell: true
        })
        killer.on('close', () => resolve())
        killer.on('error', () => resolve())
      })
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        try {
          child.kill('SIGTERM')
        } catch {
          /* ignore */
        }
      }
    }
  }
}
