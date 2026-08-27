import { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { WsServer } from './services/ws-server.js'
import { RunManager } from './services/run-manager.js'
import { ProjectService } from './services/project-service.js'
import { SettingsStore } from './services/settings-store.js'
import { SpecFs } from './services/spec-fs.js'
import { LspService } from './services/lsp-service.js'

const isDev = !app.isPackaged

let mainWindow = null
const settingsStore = new SettingsStore()
const projectService = new ProjectService()
const wsServer = new WsServer()
const specFs = new SpecFs(() => projectService.get()?.path)

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

const runManager = new RunManager({
  wsServer,
  getSettings: () => settingsStore.get(),
  getProject: () => projectService.get(),
  send
})

const lspService = new LspService({
  getSettings: () => settingsStore.get(),
  getProject: () => projectService.get(),
  send
})

wsServer.onEvent = (event) => send('execution:event', event)
wsServer.onConnectionChange = (count) =>
  send('ws:connection', { clients: count, port: wsServer.port })

function resolveIcon() {
  // Prefer Windows .ico (taskbar); fall back to PNG used by in-app logo
  const base = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(__dirname, '../../resources')
  const ico = join(base, 'icon.ico')
  const png = join(base, 'icon.png')
  if (process.platform === 'win32' && existsSync(ico)) return ico
  if (existsSync(png)) return png
  return ico
}

function createWindow() {
  const iconPath = resolveIcon()
  const iconImage = nativeImage.createFromPath(iconPath)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'GaugeStudio',
    backgroundColor: '#071019',
    icon: iconImage.isEmpty() ? iconPath : iconImage,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (!iconImage.isEmpty()) {
    mainWindow.setIcon(iconImage)
  }
  mainWindow.setMenuBarVisibility(false)
  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('did-fail-load', code, desc)
  })
  mainWindow.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error('preload-error', preloadPath, error)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc() {
  ipcMain.handle('settings:get', async () => settingsStore.get())
  ipcMain.handle('settings:save', async (_e, partial) => settingsStore.save(partial || {}))

  ipcMain.handle('project:open', async (_e, projectPath) => {
    let target = projectPath
    if (!target) {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '打开 Gauge 项目',
        properties: ['openDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null
      target = result.filePaths[0]
    }
    const project = await projectService.open(target)
    await settingsStore.save({ lastProjectPath: project.path })
    try {
      await lspService.start()
    } catch (err) {
      console.warn('lsp start failed', err)
    }
    return project
  })

  ipcMain.handle('project:get', async () => projectService.get())
  ipcMain.handle('project:pick', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '打开 Gauge 项目',
      properties: ['openDirectory']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('run:start', async (_e, opts) => {
    try {
      return await runManager.start(opts || {})
    } catch (err) {
      send('console:data', { stream: 'stderr', text: `${err.message}\n` })
      throw err
    }
  })

  ipcMain.handle('run:stop', async () => runManager.stop())

  ipcMain.handle('run:retryFailed', async (_e, jobs) => {
    try {
      return await runManager.retryJobs(jobs || [], '重试失败中')
    } catch (err) {
      send('console:data', { stream: 'stderr', text: `${err.message}\n` })
      throw err
    }
  })

  ipcMain.handle('run:retryOne', async (_e, job) => {
    try {
      return await runManager.retryJobs([job], job?.label || '重试中')
    } catch (err) {
      send('console:data', { stream: 'stderr', text: `${err.message}\n` })
      throw err
    }
  })

  ipcMain.handle('run:isRunning', async () => runManager.isRunning())

  ipcMain.handle('spec:read', async (_e, relPath) => specFs.read(relPath))
  ipcMain.handle('spec:write', async (_e, relPath, content) => specFs.write(relPath, content))

  ipcMain.handle('lsp:complete', async (_e, params) => lspService.complete(params || {}))
  ipcMain.handle('lsp:restart', async () => lspService.restart())
  ipcMain.handle('lsp:status', async () => lspService.getStatus())

  ipcMain.handle('app:getPaths', async () => ({
    userData: app.getPath('userData'),
    demoHint: 'gauge-js-demo'
  }))
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gaugestudio.app')
  }
  Menu.setApplicationMenu(null)
  await settingsStore.load()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await runManager.stop()
  await lspService.stop()
  await wsServer.stop()
  if (process.platform !== 'darwin') app.quit()
})
