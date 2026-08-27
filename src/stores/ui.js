import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    explorerCollapsed: false,
    settingsOpen: false,
    settingsPanel: 'general',
    tags: '通用'
  }),
  actions: {
    toggleExplorer() {
      this.explorerCollapsed = !this.explorerCollapsed
    }
  }
})
