<script setup>
import { FolderOpened, Refresh, Expand, Fold } from '@element-plus/icons-vue'
import { useAppStore } from '../stores/app.js'
import SpecTree from './SpecTree.vue'

const app = useAppStore()
</script>

<template>
  <div class="gs-panel">
    <div class="gs-panel-header">
      <h2>测试脚本</h2>
      <el-button-group>
        <el-button
          title="重新扫描项目 Spec / Concept"
          :disabled="!app.project"
          :icon="Refresh"
          @click="app.refreshProject()"
        />
        <el-button title="打开 Gauge 项目" :icon="FolderOpened" @click="app.pickAndOpenProject()">打开</el-button>
        <el-button title="展开全部" :disabled="!app.project" :icon="Expand" @click="app.expandAll()" />
        <el-button title="折叠全部" :disabled="!app.project" :icon="Fold" @click="app.collapseAll()" />
      </el-button-group>
    </div>
    <div class="sidebar-body">
      <el-empty
        v-if="!app.project"
        :image-size="72"
        description="点击「打开」选择 Gauge 项目目录"
      >
        <template #default>
          <p class="empty-code">例如 gauge-js-demo</p>
        </template>
      </el-empty>
      <SpecTree v-else />
    </div>
  </div>
</template>
