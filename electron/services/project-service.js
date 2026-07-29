import fs from 'fs/promises'
import path from 'path'

/**
 * Scan Gauge project: manifest, env/, specs tree (.spec only), .cpt list.
 */
export class ProjectService {
  constructor() {
    this.project = null
  }

  async open(projectPath) {
    const root = path.resolve(projectPath)
    const stat = await fs.stat(root)
    if (!stat.isDirectory()) {
      throw new Error('项目路径不是目录')
    }

    const manifestPath = path.join(root, 'manifest.json')
    let manifest = null
    let hasStudioReporter = false
    try {
      const raw = await fs.readFile(manifestPath, 'utf8')
      manifest = JSON.parse(raw)
      const plugins = manifest.Plugins || manifest.plugins || []
      hasStudioReporter = plugins.some(
        (p) => String(p).toLowerCase() === 'studio-reporter'
      )
    } catch {
      manifest = null
    }

    const envs = await this.#scanEnvs(root)
    const specsTree = await this.#buildSpecsTree(root)
    const concepts = await this.#scanConcepts(root)

    this.project = {
      path: root,
      name: path.basename(root),
      manifest,
      hasStudioReporter,
      envs,
      specsTree,
      concepts,
      openedAt: new Date().toISOString()
    }
    return this.project
  }

  get() {
    return this.project
  }

  async #scanEnvs(root) {
    const envDir = path.join(root, 'env')
    try {
      const entries = await fs.readdir(envDir, { withFileTypes: true })
      const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
      return dirs.length ? dirs.sort() : ['default']
    } catch {
      return ['default']
    }
  }

  async #scanConcepts(root) {
    const concepts = []
    async function walk(dir) {
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'reports') continue
          await walk(full)
        } else if (ent.isFile() && ent.name.endsWith('.cpt')) {
          const content = await fs.readFile(full, 'utf8')
          const headings = []
          for (const line of content.split(/\r?\n/)) {
            const m = line.match(/^#\s+(.+)$/)
            if (m) headings.push(m[1].trim())
          }
          concepts.push({
            path: path.relative(root, full).replace(/\\/g, '/'),
            headings
          })
        }
      }
    }
    await walk(root)
    return concepts
  }

  /**
   * Build folder tree containing only directories that have .spec files
   * (or descendants with .spec). specs/ root expanded by default.
   */
  async #buildSpecsTree(root) {
    const specsRoot = path.join(root, 'specs')
    let start = specsRoot
    try {
      await fs.access(specsRoot)
    } catch {
      start = root
    }

    const tree = await this.#scanDir(start, root, true)
    if (!tree) {
      return {
        name: 'specs',
        path: 'specs',
        type: 'folder',
        expanded: true,
        children: []
      }
    }
    return tree
  }

  async #scanDir(absDir, projectRoot, isRoot) {
    let entries
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true })
    } catch {
      return null
    }

    const children = []
    for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(absDir, ent.name)
      if (ent.isDirectory()) {
        if (['node_modules', '.git', 'reports', 'logs', '.gauge'].includes(ent.name)) continue
        const child = await this.#scanDir(full, projectRoot, false)
        if (child) children.push(child)
      } else if (ent.isFile() && ent.name.endsWith('.spec')) {
        const rel = path.relative(projectRoot, full).replace(/\\/g, '/')
        children.push({
          id: rel.replace(/\.spec$/, '').replace(/[\\/]/g, '__'),
          name: ent.name.replace(/\.spec$/, ''),
          path: rel,
          type: 'spec',
          checked: /smoke\.spec$/i.test(rel),
          expanded: false
        })
      }
    }

    if (!children.length) return null

    const rel = path.relative(projectRoot, absDir).replace(/\\/g, '/') || path.basename(absDir)
    const name = path.basename(absDir)
    return {
      name,
      path: rel,
      type: 'folder',
      expanded: isRoot || name === 'specs',
      children
    }
  }
}
