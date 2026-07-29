import fs from 'fs/promises'
import path from 'path'

/**
 * Read / write .spec files under the opened project.
 */
export class SpecFs {
  constructor(getProjectPath) {
    this.getProjectPath = getProjectPath
  }

  #resolve(relPath) {
    const root = this.getProjectPath()
    if (!root) throw new Error('未打开项目')
    const normalized = String(relPath).replace(/\\/g, '/')
    if (normalized.includes('..')) throw new Error('非法路径')
    if (!normalized.endsWith('.spec')) throw new Error('仅允许读写 .spec 文件')
    const full = path.resolve(root, normalized)
    if (!full.startsWith(path.resolve(root))) throw new Error('路径越界')
    return full
  }

  async read(relPath) {
    const full = this.#resolve(relPath)
    const content = await fs.readFile(full, 'utf8')
    return { path: relPath.replace(/\\/g, '/'), content }
  }

  async write(relPath, content) {
    const full = this.#resolve(relPath)
    await fs.writeFile(full, content ?? '', 'utf8')
    return { path: relPath.replace(/\\/g, '/'), ok: true }
  }
}
