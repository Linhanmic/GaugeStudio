import { contextBridge, ipcRenderer } from 'electron'

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

const allowedOn = new Set([
  'execution:event',
  'console:data',
  'run:status',
  'run:finished',
  'ws:connection',
  'lsp:status'
])

contextBridge.exposeInMainWorld('gaugeStudio', {
  settings: {
    get: () => invoke('settings:get'),
    save: (partial) => invoke('settings:save', partial)
  },
  project: {
    open: (path) => invoke('project:open', path),
    get: () => invoke('project:get'),
    pick: () => invoke('project:pick')
  },
  run: {
    start: (opts) => invoke('run:start', opts),
    stop: () => invoke('run:stop'),
    retryFailed: (jobs) => invoke('run:retryFailed', jobs),
    retryOne: (job) => invoke('run:retryOne', job),
    isRunning: () => invoke('run:isRunning')
  },
  spec: {
    read: (path) => invoke('spec:read', path),
    write: (path, content) => invoke('spec:write', path, content)
  },
  lsp: {
    complete: (params) => invoke('lsp:complete', params),
    restart: () => invoke('lsp:restart'),
    status: () => invoke('lsp:status')
  },
  app: {
    getPaths: () => invoke('app:getPaths')
  },
  on: (channel, handler) => {
    if (!allowedOn.has(channel)) return () => {}
    const listener = (_event, payload) => handler(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
})
