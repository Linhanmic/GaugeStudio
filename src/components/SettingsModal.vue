<script setup>
import { reactive, watch, computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'

const app = useAppStore()
const draft = reactive({ ...DEFAULT_SETTINGS })

watch(
  () => app.settingsOpen,
  (open) => {
    if (open) Object.assign(draft, app.settings)
  }
)

const cmdPreview = computed(() => {
  const parts = ['gauge', 'run', '<specs>']
  if (draft.defaultEnv && draft.defaultEnv !== 'default') parts.push('--env', draft.defaultEnv)
  if (draft.parallel) {
    parts.push('--parallel')
    if (draft.streams > 0) parts.push(`-n=${draft.streams}`)
    if (draft.strategy) parts.push(`--strategy=${draft.strategy}`)
  }
  if (draft.verbose) parts.push('--verbose')
  if (draft.failSafe) parts.push('--fail-safe')
  if (draft.hideSuggestion) parts.push('--hide-suggestion')
  if (draft.machineReadable) parts.push('--machine-readable')
  if (draft.sort) parts.push('--sort')
  if (draft.simpleConsole) parts.push('--simple-console')
  if (draft.maxRetries > 0) parts.push(`--max-retries-count=${draft.maxRetries}`)
  if (draft.logLevel && draft.logLevel !== 'info') parts.push(`--log-level=${draft.logLevel}`)
  if (draft.extraArgs) parts.push(draft.extraArgs)
  return parts.join(' ')
})

function switchPanel(id) {
  app.settingsPanel = id
}

function reset() {
  Object.assign(draft, DEFAULT_SETTINGS)
}

function save() {
  app.saveSettings({ ...draft })
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open: app.settingsOpen }" @click.self="app.settingsOpen = false">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="flex items-baseline flex-wrap">
          <h2>运行设置</h2>
          <span class="sub">应用级持久化 · 写入 Electron userData</span>
        </div>
        <button class="btn-ghost !py-1 !px-2.5" type="button" @click="app.settingsOpen = false">关闭</button>
      </div>

      <div class="modal-main">
        <nav class="settings-nav" aria-label="设置分类">
          <button type="button" :class="{ active: app.settingsPanel === 'general' }" @click="switchPanel('general')">
            连接与路径
          </button>
          <button type="button" :class="{ active: app.settingsPanel === 'parallel' }" @click="switchPanel('parallel')">
            并行执行
          </button>
          <button type="button" :class="{ active: app.settingsPanel === 'advanced' }" @click="switchPanel('advanced')">
            高级参数
          </button>
          <div class="nav-hint">保存后写入 userData/settings.json；Tags / Spec 勾选仍为会话级。</div>
        </nav>

        <div class="settings-panels">
          <section v-show="app.settingsPanel === 'general'" class="settings-panel active">
            <h3 class="panel-title">连接与路径</h3>
            <p class="panel-desc">配置 Gauge 主路径与 Studio Reporter 端口。</p>
            <div class="form-row">
              <div class="row-label">
                <strong>Gauge 主路径</strong>
                <span>gauge</span>
              </div>
              <div class="row-control">
                <input v-model="draft.gaugePath" type="text" placeholder="gauge 命令或绝对路径" />
                <span class="hint">可填可执行文件路径，或使用系统 PATH 中的 gauge</span>
              </div>
            </div>
            <div class="form-row">
              <div class="row-label">
                <strong>Studio Reporter 端口</strong>
                <span>GAUGE_STUDIO_WS</span>
              </div>
              <div class="row-control">
                <input v-model.number="draft.wsPort" type="number" min="1" max="65535" />
                <span class="hint">优先使用此端口；占用时自动回退到临时端口</span>
              </div>
            </div>
            <div class="form-row">
              <div class="row-label">
                <strong>运行环境</strong>
                <span>--env</span>
              </div>
              <div class="row-control">
                <select v-model="draft.defaultEnv">
                  <option v-for="e in app.envs" :key="e" :value="e">{{ e }}</option>
                </select>
                <span class="hint">扫描项目 env/ 子目录</span>
              </div>
            </div>
          </section>

          <section v-show="app.settingsPanel === 'parallel'">
            <h3 class="panel-title">并行执行</h3>
            <p class="panel-desc">MVP 串行 UI；仍可向 CLI 传递并行参数。</p>
            <div class="form-row">
              <div class="row-label"><strong>启用并行</strong><span>--parallel</span></div>
              <div class="row-control">
                <select v-model="draft.parallel">
                  <option :value="false">否</option>
                  <option :value="true">是</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="row-label"><strong>Streams</strong><span>-n</span></div>
              <div class="row-control">
                <input v-model.number="draft.streams" type="number" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="row-label"><strong>策略</strong><span>--strategy</span></div>
              <div class="row-control">
                <select v-model="draft.strategy">
                  <option value="lazy">lazy</option>
                  <option value="eager">eager</option>
                </select>
              </div>
            </div>
          </section>

          <section v-show="app.settingsPanel === 'advanced'">
            <h3 class="panel-title">高级参数</h3>
            <p class="panel-desc">日志级别、重试与输出 flags。</p>
            <div class="form-row">
              <div class="row-label"><strong>日志级别</strong><span>--log-level</span></div>
              <div class="row-control">
                <select v-model="draft.logLevel">
                  <option value="debug">debug</option>
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="error">error</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="row-label"><strong>最大重试</strong><span>--max-retries-count</span></div>
              <div class="row-control">
                <input v-model.number="draft.maxRetries" type="number" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="row-label"><strong>额外参数</strong><span>extraArgs</span></div>
              <div class="row-control">
                <input v-model="draft.extraArgs" type="text" placeholder="追加到 gauge run" />
              </div>
            </div>
            <label class="flag-row">
              <input v-model="draft.verbose" type="checkbox" />
              <div class="flag-meta"><span class="flag-title">详细输出</span><code>--verbose</code></div>
            </label>
            <label class="flag-row">
              <input v-model="draft.failSafe" type="checkbox" />
              <div class="flag-meta"><span class="flag-title">失败后继续</span><code>--fail-safe</code></div>
            </label>
            <label class="flag-row">
              <input v-model="draft.hideSuggestion" type="checkbox" />
              <div class="flag-meta"><span class="flag-title">隐藏步骤建议</span><code>--hide-suggestion</code></div>
            </label>
            <label class="flag-row">
              <input v-model="draft.machineReadable" type="checkbox" />
              <div class="flag-meta"><span class="flag-title">机器可读输出</span><code>--machine-readable</code></div>
            </label>
            <label class="flag-row">
              <input v-model="draft.sort" type="checkbox" />
              <div class="flag-meta"><span class="flag-title">按字母序执行 Spec</span><code>--sort</code></div>
            </label>
            <label class="flag-row">
              <input v-model="draft.simpleConsole" type="checkbox" />
              <div class="flag-meta"><span class="flag-title">简化控制台输出</span><code>--simple-console</code></div>
            </label>
          </section>
        </div>
      </div>

      <div class="settings-preview">
        <div class="label">命令预览</div>
        <code class="preview-box">{{ cmdPreview }}</code>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" type="button" @click="reset()">恢复默认</button>
        <div class="right">
          <button class="btn-ghost" type="button" @click="app.settingsOpen = false">取消</button>
          <button class="btn-run" type="button" @click="save()">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
