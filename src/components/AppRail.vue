<script setup>
import { useRoute, useRouter } from 'vue-router'
import {
  Monitor,
  VideoPlay,
  List,
  EditPen,
  Setting,
  FolderOpened
} from '@element-plus/icons-vue'
import { useUiStore } from '../stores/ui.js'
import logoUrl from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

const pages = [
  { name: 'console', path: '/console', label: '控制台', icon: Monitor },
  { name: 'live', path: '/live', label: '实时', icon: VideoPlay },
  { name: 'results', path: '/results', label: '结果', icon: List },
  { name: 'editor', path: '/editor', label: '编辑', icon: EditPen }
]

function go(path) {
  if (route.path !== path) router.push(path)
}
</script>

<template>
  <nav class="rail" aria-label="工作区">
    <div class="rail-brand" title="GaugeStudio">
      <img :src="logoUrl" width="32" height="32" alt="GaugeStudio" />
    </div>

    <div class="rail-pages">
      <button
        v-for="p in pages"
        :key="p.name"
        type="button"
        class="rail-item"
        :class="{ active: route.path === p.path }"
        :title="p.label"
        @click="go(p.path)"
      >
        <el-icon :size="20"><component :is="p.icon" /></el-icon>
        <span>{{ p.label }}</span>
      </button>
    </div>

    <div class="rail-foot">
      <button
        type="button"
        class="rail-item"
        :class="{ active: !ui.explorerCollapsed }"
        title="显示 / 隐藏脚本树"
        @click="ui.toggleExplorer()"
      >
        <el-icon :size="20"><FolderOpened /></el-icon>
        <span>脚本</span>
      </button>
      <button type="button" class="rail-item" title="设置" @click="ui.settingsOpen = true">
        <el-icon :size="20"><Setting /></el-icon>
        <span>设置</span>
      </button>
    </div>
  </nav>
</template>
