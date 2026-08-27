<script setup>
import { onMounted } from 'vue'
import { useAppStore } from './stores/app.js'
import { useExecutionStore } from './stores/execution.js'
import { useConsoleStore } from './stores/console.js'
import AppHeader from './components/AppHeader.vue'
import SpecSidebar from './components/SpecSidebar.vue'
import SettingsDialog from './components/SettingsDialog.vue'

const app = useAppStore()
const execution = useExecutionStore()
const consoleStore = useConsoleStore()

onMounted(async () => {
  execution.bindEvents()
  consoleStore.bindEvents()
  await app.init()
})
</script>

<template>
  <el-container class="app-shell" direction="vertical">
    <el-header class="app-header" height="auto">
      <AppHeader />
    </el-header>
    <el-container class="app-body">
      <el-aside class="app-aside" width="280px">
        <SpecSidebar />
      </el-aside>
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>
    <SettingsDialog />
  </el-container>
</template>
