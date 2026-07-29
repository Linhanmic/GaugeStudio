import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'

/**
 * Persist settings to Electron userData (not only localStorage).
 */
export class SettingsStore {
  constructor() {
    this.filePath = null
    this.settings = { ...DEFAULT_SETTINGS }
  }

  #path() {
    if (!this.filePath) {
      this.filePath = path.join(app.getPath('userData'), 'settings.json')
    }
    return this.filePath
  }

  async load() {
    try {
      const raw = await fs.readFile(this.#path(), 'utf8')
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS }
    }
    return this.settings
  }

  async save(partial) {
    this.settings = { ...DEFAULT_SETTINGS, ...this.settings, ...partial }
    await fs.mkdir(path.dirname(this.#path()), { recursive: true })
    await fs.writeFile(this.#path(), JSON.stringify(this.settings, null, 2), 'utf8')
    return this.settings
  }

  get() {
    return this.settings
  }
}
