<script setup>
import { RefreshRight } from '@element-plus/icons-vue'
</script>

<template>
  <div class="gs-panel">
    <div class="gs-panel-header">
      <div class="editor-heading">
        <span class="stage-kicker">Editor</span>
        <h2>Spec 编辑</h2>
        <span class="editor-path">从左侧双击 .spec 文件打开</span>
      </div>
      <el-space>
        <el-button disabled>还原</el-button>
        <el-button type="primary" disabled>保存</el-button>
      </el-space>
    </div>
    <div class="editor-body">
      <div class="editor-surface">
        <div class="line-gutter" aria-hidden="true">
          <div class="line-no">1</div>
        </div>
        <div class="studio-empty">
          <p>编辑器占位</p>
          <small>后续接入 Spec 读写与 CPT 补全</small>
        </div>
      </div>
      <div class="editor-status">
        <el-space :size="16">
          <span>未修改</span>
          <span>行 1，列 1</span>
          <span>1 行</span>
        </el-space>
        <el-space>
          <el-tag type="danger" effect="light" round>LSP · 离线</el-tag>
          <el-button :icon="RefreshRight" disabled>重启LSP</el-button>
        </el-space>
      </div>
    </div>
  </div>
</template>
