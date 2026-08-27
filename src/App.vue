<script setup>
import AppRail from './components/AppRail.vue'
import CommandDock from './components/CommandDock.vue'
import SpecSidebar from './components/SpecSidebar.vue'
import StatusBar from './components/StatusBar.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import { useUiStore } from './stores/ui.js'

const ui = useUiStore()
</script>

<template>
  <div class="studio" :class="{ 'explorer-collapsed': ui.explorerCollapsed }">
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
