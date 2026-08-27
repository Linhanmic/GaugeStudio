<script setup>
import { ref, watch, nextTick } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useConsoleStore } from '../stores/console.js'

const consoleStore = useConsoleStore()
const scrollRef = ref(null)

watch(
  () => consoleStore.entries.length,
  async () => {
    await nextTick()
    const wrap = scrollRef.value?.wrapRef
    if (wrap) wrap.scrollTop = wrap.scrollHeight
  }
)
</script>

<template>
  <div class="gs-panel terminal">
    <div class="gs-panel-header">
      <div class="term-title">
        <span class="term-dots" aria-hidden="true"><i /><i /><i /></span>
        <h2>gauge stdout / stderr</h2>
      </div>
      <el-button text :icon="Delete" @click="consoleStore.clear()">清空</el-button>
    </div>
    <el-scrollbar ref="scrollRef" class="console-scroll">
      <div class="gauge-console" aria-live="polite">
        <span v-if="consoleStore.isEmpty" class="c-line c-dim">等待 Run · 此处只显示进程输出，不混入 WebSocket 事件</span>
        <span
          v-for="(line, i) in consoleStore.entries"
          :key="i"
          class="c-line"
          :class="line.kind ? `c-${line.kind}` : ''"
        >{{ line.text }}</span>
      </div>
    </el-scrollbar>
  </div>
</template>
