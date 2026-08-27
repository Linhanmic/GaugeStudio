<script setup>
import { useExecutionStore } from '../stores/execution.js'
import StepTables from './StepTables.vue'

defineOptions({ name: 'LiveStepTree' })

defineProps({
  steps: { type: Array, default: () => [] }
})

const execution = useExecutionStore()
</script>

<template>
  <ul class="live-tree">
    <li v-for="(st, i) in steps" :key="`${st.kind}-${st.text}-${i}`">
      <div class="node" :data-status="st.status" :data-kind="st.kind || 'step'">
        <span class="node-icon">{{ execution.iconFor(st.status) }}</span>
        <div class="node-label">
          <strong>
            <span class="kind">{{ st.kind === 'concept' ? 'concept' : 'step' }}</span>
            {{ st.text }}
          </strong>
          <StepTables :tables="st.tables" />
        </div>
        <span class="node-meta">
          {{ st.status === 'skipped' ? 'skipped' : st.ms != null ? `${st.ms}ms` : '' }}
        </span>
      </div>
      <LiveStepTree v-if="st.kind === 'concept' && st.children?.length" :steps="st.children" />
    </li>
  </ul>
</template>
