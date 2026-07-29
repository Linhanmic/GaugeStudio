<script setup>
import { computed } from 'vue'
import SpecTreeNode from './SpecTreeNode.vue'

const props = defineProps({
  node: { type: Object, required: true },
  editingPath: { type: String, default: '' }
})

const emit = defineEmits(['toggle', 'check', 'checkFolder', 'open'])

const FOLDER_SVG =
  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.879a1.5 1.5 0 0 1 1.06.44l.622.621A1.5 1.5 0 0 0 9.62 3H13A1.5 1.5 0 0 1 14.5 4.5v8A1.5 1.5 0 0 1 13 14H3A1.5 1.5 0 0 1 1.5 12.5v-9z"/></svg>'
const FILE_SVG =
  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.207a1.5 1.5 0 0 0-.44-1.06L9.853.94A1.5 1.5 0 0 0 8.793.5H4z"/></svg>'

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

function onFolderCheck(e) {
  // When indeterminate, force "select all" on click (native may leave checked=false)
  const next = checkState.value?.indeterminate ? true : !!e.target.checked
  emit('checkFolder', props.node, next)
}
</script>

<template>
  <div v-if="node.type === 'folder'" class="tree-folder" :class="{ collapsed: !node.expanded }">
    <div class="folder-row" @click="emit('toggle', node)">
      <input
        type="checkbox"
        title="全选/取消此目录（含子目录）"
        :checked="!!checkState?.checked"
        :indeterminate="!!checkState?.indeterminate"
        @click.stop
        @change="onFolderCheck"
      />
      <span class="chevron" title="展开/折叠" @click.stop="emit('toggle', node)">▼</span>
      <span class="folder-icon" v-html="FOLDER_SVG" />
      <span class="dir-label">{{ node.name }}</span>
      <span class="node-badge">{{ specCount }}</span>
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
    <input
      type="checkbox"
      :checked="!!node.checked"
      @click.stop
      @change="emit('check', node, $event.target.checked)"
    />
    <span />
    <span class="file-icon" v-html="FILE_SVG" />
    <span class="dir-label" :title="node.path">{{ fileName(node.path) }}</span>
  </div>
</template>
