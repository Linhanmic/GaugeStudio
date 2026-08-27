<script setup>
defineProps({
  tables: { type: Array, default: () => [] }
})

function headersOf(table) {
  if (table?.headers?.length) return table.headers
  const first = table?.rows?.[0] || []
  return first.map((_, i) => `列 ${i + 1}`)
}

function rowsOf(table) {
  const headers = headersOf(table)
  return (table.rows || []).map((row) => {
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? ''
    })
    return obj
  })
}
</script>

<template>
  <div v-if="tables?.length" class="step-tables">
    <el-table
      v-for="(t, ti) in tables"
      :key="ti"
      :data="rowsOf(t)"
      size="small"
      border
      class="step-el-table"
    >
      <el-table-column
        v-for="h in headersOf(t)"
        :key="h"
        :prop="h"
        :label="h"
        min-width="96"
        show-overflow-tooltip
      />
    </el-table>
  </div>
</template>
