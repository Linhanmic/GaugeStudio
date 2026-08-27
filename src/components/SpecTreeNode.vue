<script setup>
import { computed } from 'vue'
import { Folder, Document } from '@element-plus/icons-vue'
import SpecTreeNode from './SpecTreeNode.vue'

defineOptions({ name: 'SpecTreeNode' })

const props = defineProps({
  node: { type: Object, required: true },
  editingPath: { type: String, default: '' }
})

const emit = defineEmits(['toggle', 'check', 'checkFolder', 'open'])

function countSpecs(node) {
  if (!node) return 0
  if (node.type === 'spec') return 1
  return (node.children || []).reduce((sum, c) => sum + countSpecs(c), 0)
}

function folderCheckState(node) {
  const specs = []
  function collect(n) {
    if (!n) return
    if (n.type === 'spec') specs.push(n)
    else (n.children || []).forEach(collect)
  }
  collect(node)
  const n = specs.filter((s) => s.checked).length
  if (!specs.length) return { checked: false, indeterminate: false }
  if (n === 0) return { checked: false, indeterminate: false }
  if (n === specs.length) return { checked: true, indeterminate: false }
  return { checked: false, indeterminate: true }
}

const checkState = computed(() =>
  props.node.type === 'folder' ? folderCheckState(props.node) : null
)

const specCount = computed(() => countSpecs(props.node))

function fileName(p) {
  return String(p).split(/[\\/]/).pop()
}

function onFolderCheck(val) {
  const next = checkState.value?.indeterminate ? true : !!val
  emit('checkFolder', props.node, next)
}
</script>

<template>
  <div v-if="node.type === 'folder'" class="tree-folder" :class="{ collapsed: !node.expanded }">
    <div class="folder-row" @click="emit('toggle', node)">
      <el-checkbox
        :model-value="!!checkState?.checked"
        :indeterminate="!!checkState?.indeterminate"
        title="全选/取消此目录（含子目录）"
        @click.stop
        @change="onFolderCheck"
      />
      <span class="chevron" title="展开/折叠" @click.stop="emit('toggle', node)">▼</span>
      <el-icon class="folder-icon"><Folder /></el-icon>
      <span class="dir-label">{{ node.name }}</span>
      <el-tag size="small" type="info" effect="plain" round>{{ specCount }}</el-tag>
    </div>
    <div class="folder-children">
      <SpecTreeNode
        v-for="(child, i) in node.children"
        :key="child.path || i"
        :node="child"
        :editing-path="editingPath"
        @toggle="(n) => emit('toggle', n)"
        @check="(n, c) => emit('check', n, c)"
        @checkFolder="(n, c) => emit('checkFolder', n, c)"
        @open="(n) => emit('open', n)"
      />
    </div>
  </div>

  <div
    v-else
    class="file-row"
    :class="{
      active: !!node.checked,
      editing: editingPath === node.path
    }"
    @dblclick="emit('open', node)"
  >
    <el-checkbox
      :model-value="!!node.checked"
      @click.stop
      @change="(v) => emit('check', node, v)"
    />
    <span />
    <el-icon class="file-icon"><Document /></el-icon>
    <span class="dir-label" :title="node.path">{{ fileName(node.path) }}</span>
  </div>
</template>
