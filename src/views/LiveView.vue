<script setup>
import { VideoPlay } from '@element-plus/icons-vue'
</script>

<template>
  <div class="gs-panel live">
    <div class="gs-panel-header">
      <div>
        <span class="stage-kicker">Live</span>
        <h2>当前 Scenario</h2>
      </div>
      <span class="header-meta">仅显示当前正在运行的 Scenario</span>
    </div>
    <div class="studio-empty live-empty">
      <el-icon :size="36"><VideoPlay /></el-icon>
      <p>实时运行占位</p>
      <small>后续接入当前 Scenario 执行树</small>
    </div>
  </div>
</template>
