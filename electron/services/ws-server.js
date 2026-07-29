import { WebSocketServer } from 'ws'

/**
 * WebSocket server that receives studio-reporter JSON envelopes
 * and forwards normalized events to the renderer via callback.
 */
export class WsServer {
  constructor() {
    this.wss = null
    this.port = 0
    this.runId = null
    this.onEvent = null
    this.onConnectionChange = null
    this.clientCount = 0
  }

  async start(preferredPort = 0) {
    await this.stop()
    const port = preferredPort > 0 ? preferredPort : 0
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ host: '127.0.0.1', port })
        this.wss.once('listening', () => {
          const addr = this.wss.address()
          this.port = typeof addr === 'object' && addr ? addr.port : port
          resolve({ port: this.port, url: `ws://127.0.0.1:${this.port}` })
        })
        this.wss.on('error', (err) => {
          if (!this.port) reject(err)
        })
        this.wss.on('connection', (ws) => {
          this.clientCount += 1
          this.onConnectionChange?.(this.clientCount)
          ws.on('message', (data) => this.#handleMessage(data))
          ws.on('close', () => {
            this.clientCount = Math.max(0, this.clientCount - 1)
            this.onConnectionChange?.(this.clientCount)
          })
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  setRunId(runId) {
    this.runId = runId
  }

  #handleMessage(data) {
    let raw
    try {
      raw = JSON.parse(data.toString())
    } catch {
      return
    }
    if (!raw || typeof raw.type !== 'string') return
    const event = {
      runId: this.runId,
      type: raw.type,
      timestamp: raw.timestamp || new Date().toISOString(),
      payload: raw.payload || {}
    }
    this.onEvent?.(event)
  }

  async stop() {
    if (!this.wss) return
    const wss = this.wss
    this.wss = null
    this.port = 0
    this.clientCount = 0
    await new Promise((resolve) => {
      for (const client of wss.clients) {
        try {
          client.close()
        } catch {
          /* ignore */
        }
      }
      wss.close(() => resolve())
    })
  }

  getUrl() {
    return this.port ? `ws://127.0.0.1:${this.port}` : null
  }
}
