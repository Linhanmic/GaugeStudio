<script setup>
import { useUiStore } from '../stores/ui.js'

const ui = useUiStore()
</script>

<template>
  <el-dialog
    v-model="ui.settingsOpen"
    width="820px"
    top="8vh"
    append-to-body
    class="settings-dialog"
  >
    <template #header>
      <div class="settings-title">
        <span>运行设置</span>
        <small>界面占位 · 尚未接入持久化</small>
      </div>
    </template>

    <el-container class="settings-body">
      <el-aside width="168px" class="settings-aside">
        <el-menu :default-active="ui.settingsPanel" @select="(id) => (ui.settingsPanel = id)">
          <el-menu-item index="general">连接与路径</el-menu-item>
          <el-menu-item index="parallel">并行执行</el-menu-item>
          <el-menu-item index="advanced">高级参数</el-menu-item>
        </el-menu>
        <p class="nav-hint">设置表单稍后接入。</p>
      </el-aside>
      <el-main class="settings-main">
        <section v-show="ui.settingsPanel === 'general'">
          <h3 class="panel-title">连接与路径</h3>
          <p class="panel-desc">Gauge 路径、Reporter 端口、运行环境。</p>
        </section>
        <section v-show="ui.settingsPanel === 'parallel'">
          <h3 class="panel-title">并行执行</h3>
          <p class="panel-desc">并行开关、Streams、策略。</p>
        </section>
        <section v-show="ui.settingsPanel === 'advanced'">
          <h3 class="panel-title">高级参数</h3>
          <p class="panel-desc">日志级别、重试与输出 flags。</p>
        </section>
      </el-main>
    </el-container>

    <template #footer>
      <div class="settings-footer">
        <el-button disabled>恢复默认</el-button>
        <div class="right">
          <el-button @click="ui.settingsOpen = false">取消</el-button>
          <el-button type="primary" disabled>保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
