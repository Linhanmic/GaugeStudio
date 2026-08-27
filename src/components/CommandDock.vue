<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { VideoPlay, VideoPause, RefreshLeft, Delete } from '@element-plus/icons-vue'
import { useUiStore } from '../stores/ui.js'

const route = useRoute()
const ui = useUiStore()
const pageTitle = computed(() => route.meta.title || 'GaugeStudio')
</script>

<template>
  <header class="dock">
    <div class="dock-page">
      <span class="dock-kicker">Workspace</span>
      <h1>{{ pageTitle }}</h1>
    </div>

    <div class="dock-run">
      <button class="run-btn" type="button">
        <el-icon><VideoPlay /></el-icon>
        Run
      </button>
      <button class="ghost-btn danger" type="button" disabled>
        <el-icon><VideoPause /></el-icon>
        Stop
      </button>
      <button class="ghost-btn" type="button" disabled>
        <el-icon><RefreshLeft /></el-icon>
        重试失败
      </button>
      <button class="ghost-btn" type="button" disabled>
        <el-icon><Delete /></el-icon>
        清空
      </button>
    </div>

    <label class="dock-tags">
      <span>Tags</span>
      <el-input v-model="ui.tags" placeholder="通用" clearable />
    </label>

    <div class="dock-state" data-state="idle">
      <i class="state-dot" />
      <span>就绪</span>
    </div>
  </header>
</template>
