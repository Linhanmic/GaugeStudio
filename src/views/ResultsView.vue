<script setup>
import { ref } from 'vue'

const density = ref('comfortable')
const filter = ref('all')
const densityOptions = [
  { value: 'comfortable', label: '标准' },
  { value: 'compact', label: '极简' }
]
const filters = [
  { value: 'all', label: '全部' },
  { value: 'running', label: '运行中' },
  { value: 'passed', label: '已通过' },
  { value: 'failed', label: '失败' }
]
</script>

<template>
  <div class="gs-panel">
    <div class="gs-panel-header">
      <div>
        <span class="stage-kicker">Results</span>
        <h2>运行结果</h2>
      </div>
      <div class="results-toolbar">
        <el-segmented v-model="density" :options="densityOptions" />
        <el-segmented v-model="filter" :options="filters" />
      </div>
    </div>
    <div class="studio-empty live-empty">
      <p>结果列表占位</p>
      <small>后续接入 Scenario 卡片与详情</small>
    </div>
  </div>
</template>
