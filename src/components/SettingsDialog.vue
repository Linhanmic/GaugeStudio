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

function reset() {
  Object.assign(draft, DEFAULT_SETTINGS)
}

function save() {
  app.saveSettings({ ...draft })
}
</script>

<template>
  <el-dialog
    v-model="app.settingsOpen"
    title="运行设置"
    width="820px"
    top="8vh"
    append-to-body
    class="settings-dialog"
  >
    <template #header>
      <div class="settings-title">
        <span>运行设置</span>
        <small>应用级持久化 · 写入 Electron userData</small>
      </div>
    </template>

    <el-container class="settings-body">
      <el-aside width="168px" class="settings-aside">
        <el-menu :default-active="app.settingsPanel" @select="(id) => (app.settingsPanel = id)">
          <el-menu-item index="general">连接与路径</el-menu-item>
          <el-menu-item index="parallel">并行执行</el-menu-item>
          <el-menu-item index="advanced">高级参数</el-menu-item>
        </el-menu>
        <p class="nav-hint">保存后写入 userData/settings.json；Tags / Spec 勾选仍为会话级。</p>
      </el-aside>

      <el-main class="settings-main">
        <el-form v-show="app.settingsPanel === 'general'" label-position="left" label-width="160px">
          <h3 class="panel-title">连接与路径</h3>
          <p class="panel-desc">配置 Gauge 主路径与 Studio Reporter 端口。</p>
          <el-form-item>
            <template #label>
              <div class="form-label">
                <strong>Gauge 主路径</strong>
                <code>gauge</code>
              </div>
            </template>
            <el-input v-model="draft.gaugePath" placeholder="gauge 命令或绝对路径" />
            <div class="hint">可填可执行文件路径，或使用系统 PATH 中的 gauge</div>
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="form-label">
                <strong>Studio Reporter 端口</strong>
                <code>GAUGE_STUDIO_WS</code>
              </div>
            </template>
            <el-input-number v-model="draft.wsPort" :min="1" :max="65535" controls-position="right" />
            <div class="hint">优先使用此端口；占用时自动回退到临时端口</div>
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="form-label">
                <strong>运行环境</strong>
                <code>--env</code>
              </div>
            </template>
            <el-select v-model="draft.defaultEnv" style="width: 220px">
              <el-option v-for="e in app.envs" :key="e" :label="e" :value="e" />
            </el-select>
            <div class="hint">扫描项目 env/ 子目录</div>
          </el-form-item>
        </el-form>

        <el-form v-show="app.settingsPanel === 'parallel'" label-position="left" label-width="160px">
          <h3 class="panel-title">并行执行</h3>
          <p class="panel-desc">MVP 串行 UI；仍可向 CLI 传递并行参数。</p>
          <el-form-item>
            <template #label>
              <div class="form-label"><strong>启用并行</strong><code>--parallel</code></div>
            </template>
            <el-switch v-model="draft.parallel" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="form-label"><strong>Streams</strong><code>-n</code></div>
            </template>
            <el-input-number v-model="draft.streams" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="form-label"><strong>策略</strong><code>--strategy</code></div>
            </template>
            <el-select v-model="draft.strategy" style="width: 220px">
              <el-option label="lazy" value="lazy" />
              <el-option label="eager" value="eager" />
            </el-select>
          </el-form-item>
        </el-form>

        <el-form v-show="app.settingsPanel === 'advanced'" label-position="left" label-width="160px">
          <h3 class="panel-title">高级参数</h3>
          <p class="panel-desc">日志级别、重试与输出 flags。</p>
          <el-form-item>
            <template #label>
              <div class="form-label"><strong>日志级别</strong><code>--log-level</code></div>
            </template>
            <el-select v-model="draft.logLevel" style="width: 220px">
              <el-option label="debug" value="debug" />
              <el-option label="info" value="info" />
              <el-option label="warning" value="warning" />
              <el-option label="error" value="error" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="form-label"><strong>最大重试</strong><code>--max-retries-count</code></div>
            </template>
            <el-input-number v-model="draft.maxRetries" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="form-label"><strong>额外参数</strong><code>extraArgs</code></div>
            </template>
            <el-input v-model="draft.extraArgs" placeholder="追加到 gauge run" />
          </el-form-item>
          <el-form-item label="输出 flags">
            <el-checkbox v-model="draft.verbose">详细输出 <code>--verbose</code></el-checkbox>
            <el-checkbox v-model="draft.failSafe">失败后继续 <code>--fail-safe</code></el-checkbox>
            <el-checkbox v-model="draft.hideSuggestion">隐藏步骤建议 <code>--hide-suggestion</code></el-checkbox>
            <el-checkbox v-model="draft.machineReadable">机器可读输出 <code>--machine-readable</code></el-checkbox>
            <el-checkbox v-model="draft.sort">按字母序执行 Spec <code>--sort</code></el-checkbox>
            <el-checkbox v-model="draft.simpleConsole">简化控制台输出 <code>--simple-console</code></el-checkbox>
          </el-form-item>
        </el-form>
      </el-main>
    </el-container>

    <div class="settings-preview">
      <div class="label">命令预览</div>
      <code class="preview-box">{{ cmdPreview }}</code>
    </div>

    <template #footer>
      <div class="settings-footer">
        <el-button @click="reset()">恢复默认</el-button>
        <div class="right">
          <el-button @click="app.settingsOpen = false">取消</el-button>
          <el-button type="primary" @click="save()">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
