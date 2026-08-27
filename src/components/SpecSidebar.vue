<script setup>
import { FolderOpened, Refresh, Expand, Fold } from '@element-plus/icons-vue'
import { useAppStore } from '../stores/app.js'
import SpecTree from './SpecTree.vue'

const app = useAppStore()
</script>

<template>
  <aside v-show="!app.explorerCollapsed" class="explorer">
    <div class="explorer-head">
      <div>
        <span class="explorer-kicker">Project</span>
        <h2>测试脚本</h2>
      </div>
      <el-button-group>
        <el-button
          title="重新扫描项目 Spec / Concept"
          :disabled="!app.project"
          :icon="Refresh"
          @click="app.refreshProject()"
        />
        <el-button title="展开全部" :disabled="!app.project" :icon="Expand" @click="app.expandAll()" />
        <el-button title="折叠全部" :disabled="!app.project" :icon="Fold" @click="app.collapseAll()" />
      </el-button-group>
    </div>

    <div v-if="app.project" class="explorer-meta">
      <el-tooltip :content="app.project.path" placement="bottom">
        <code>{{ app.project.name }}</code>
      </el-tooltip>
      <span>{{ app.checkedSpecs.length }} 已选</span>
    </div>

    <div class="explorer-body">
      <div v-if="!app.project" class="studio-empty">
        <p>打开本地 Gauge 项目以加载 Spec 树</p>
        <el-button type="primary" :icon="FolderOpened" @click="app.pickAndOpenProject()">
          打开项目目录
        </el-button>
        <code>例如 gauge-js-demo</code>
      </div>
      <SpecTree v-else />
    </div>
  </aside>
</template>
