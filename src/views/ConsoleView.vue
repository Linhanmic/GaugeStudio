<script setup>
import { Delete } from '@element-plus/icons-vue'
</script>

<template>
  <div class="gs-panel terminal">
    <div class="gs-panel-header">
      <div class="term-title">
        <span class="term-dots" aria-hidden="true"><i /><i /><i /></span>
        <h2>gauge stdout / stderr</h2>
      </div>
      <el-button text :icon="Delete" disabled>清空</el-button>
    </div>
    <div class="studio-empty live-empty">
      <p>控制台占位</p>
      <small>后续接入进程 stdout / stderr</small>
    </div>
  </div>
</template>
