import { app, BrowserWindow, shell, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

const isDev = !app.isPackaged
let mainWindow = null

function resolveIcon() {
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

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gaugestudio.app')
  }
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
