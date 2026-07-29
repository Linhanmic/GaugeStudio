<script setup>
import { ref, watch, nextTick } from 'vue'
import { useConsoleStore } from '../stores/console.js'

const consoleStore = useConsoleStore()
const el = ref(null)

watch(
  () => consoleStore.entries.length,
  async () => {
    await nextTick()
    if (el.value) el.value.scrollTop = el.value.scrollHeight
  }
)
</script>

<template>
  <div class="panel" style="flex: 1; min-height: 0">
    <div class="panel-header">
      <h2>控制台</h2>
      <button class="btn-ghost btn-sm" type="button" @click="consoleStore.clear()">清空</button>
    </div>
    <div ref="el" class="gauge-console" aria-live="polite">
      <template v-if="consoleStore.isEmpty">
        <span class="c-line c-dim">（运行后显示 gauge stdout / stderr）</span>
      </template>
      <span
        v-for="(line, i) in consoleStore.entries"
        :key="i"
        class="c-line"
        :class="line.kind ? `c-${line.kind}` : ''"
      >{{ line.text }}</span>
    </div>
  </div>
</template>
