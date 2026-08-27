<script setup>
import { onMounted } from 'vue'
import { useAppStore } from './stores/app.js'
import { useExecutionStore } from './stores/execution.js'
import { useConsoleStore } from './stores/console.js'
import AppRail from './components/AppRail.vue'
import CommandDock from './components/CommandDock.vue'
import SpecSidebar from './components/SpecSidebar.vue'
import StatusBar from './components/StatusBar.vue'
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
  <div class="studio" :class="{ 'explorer-collapsed': app.explorerCollapsed }">
    <AppRail />
    <CommandDock />
    <SpecSidebar />
    <main class="stage">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
    <StatusBar />
    <SettingsDialog />
  </div>
</template>
