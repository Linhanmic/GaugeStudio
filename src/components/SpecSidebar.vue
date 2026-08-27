<script setup>
import { FolderOpened, Refresh, Expand, Fold } from '@element-plus/icons-vue'
</script>

<template>
  <aside class="explorer">
    <div class="explorer-head">
      <div>
        <span class="explorer-kicker">Project</span>
        <h2>测试脚本</h2>
      </div>
      <el-button-group>
        <el-button title="刷新" :icon="Refresh" disabled />
        <el-button title="展开全部" :icon="Expand" disabled />
        <el-button title="折叠全部" :icon="Fold" disabled />
      </el-button-group>
    </div>
    <div class="explorer-body">
      <div class="studio-empty">
        <p>脚本树占位</p>
        <el-button type="primary" :icon="FolderOpened" disabled>打开项目目录</el-button>
        <code>后续接入项目扫描</code>
      </div>
    </div>
  </aside>
</template>
