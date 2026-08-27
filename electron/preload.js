import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('gaugeStudio', {})
