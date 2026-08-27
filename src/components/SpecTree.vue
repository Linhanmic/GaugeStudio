<script setup>
import SpecTreeNode from './SpecTreeNode.vue'
import { useAppStore } from '../stores/app.js'
import { useEditorStore } from '../stores/editor.js'

const app = useAppStore()
const editor = useEditorStore()

function onOpen(node) {
  editor.openSpec(node.path)
}
</script>

<template>
  <div v-if="app.project?.specsTree" class="dir-tree">
    <SpecTreeNode
      :node="app.project.specsTree"
      :editing-path="editor.path"
      @toggle="app.toggleFolder"
      @check="(n, c) => app.setSpecChecked(n, c)"
      @checkFolder="(n, c) => app.setFolderChecked(n, c)"
      @open="onOpen"
    />
  </div>
</template>
