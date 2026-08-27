<script setup>
import StepTables from './StepTables.vue'

defineOptions({ name: 'ResultStepList' })

defineProps({
  steps: { type: Array, default: () => [] },
  prefix: { type: String, default: '' }
})

function statusText(s) {
  return ({ passed: 'passed', failed: 'failed', running: 'running', skipped: 'skipped' })[s] || s || ''
}

function indexLabel(prefix, i) {
  return prefix ? `${prefix}.${i + 1}` : String(i + 1)
}
</script>

<template>
  <div class="step-list">
    <div
      v-for="(st, i) in steps"
      :key="`${indexLabel(prefix, i)}-${st.text}`"
      class="step-item"
      :class="{ concept: st.kind === 'concept' }"
      :data-status="st.status"
    >
      <div class="step-item-top">
        <div class="step-text-wrap">
          <span v-if="st.kind === 'concept'" class="step-kind">Concept</span>
          <div class="step-text">{{ indexLabel(prefix, i) }}. {{ st.text }}</div>
        </div>
        <div class="step-meta">
          {{ statusText(st.status) }}{{ st.ms != null ? ` · ${st.ms}ms` : '' }}
        </div>
      </div>
      <StepTables :tables="st.tables" />
      <div v-if="st.error" class="step-error">{{ st.error }}</div>
      <div v-if="st.children?.length" class="step-children">
        <ResultStepList :steps="st.children" :prefix="indexLabel(prefix, i)" />
      </div>
    </div>
  </div>
</template>
