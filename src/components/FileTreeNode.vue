<script setup lang="ts">
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-vue-next'
import type { FileNode } from '@/types'

const props = defineProps<{
  node: FileNode
  active: boolean
  depth: number
}>()

const emit = defineEmits<{
  (e: 'select', node: FileNode): void
}>()

function handleClick() {
  emit('select', props.node)
}
</script>

<template>
  <div>
    <!-- Row -->
    <div
      class="flex items-center gap-1 py-0.5 pr-3 cursor-pointer rounded-sm text-[13px] transition-colors"
      :class="[
        active
          ? 'bg-accent text-foreground font-medium'
          : 'text-foreground/80 hover:bg-accent/60 hover:text-foreground',
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="handleClick"
    >
      <ChevronDown v-if="node.kind === 'directory' && node.expanded" :size="14" class="shrink-0" />
      <ChevronRight v-else-if="node.kind === 'directory'" :size="14" class="shrink-0" />
      <span v-else class="w-[14px] shrink-0" />

      <Folder v-if="node.kind === 'directory'" :size="14" class="shrink-0 text-yellow-500" />
      <FileText v-else :size="14" class="shrink-0 text-blue-400" />

      <span class="truncate flex-1">{{ node.name }}</span>
    </div>

    <!-- Children -->
    <template v-if="node.kind === 'directory' && node.expanded && node.children?.length">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :active="false"
        :depth="depth + 1"
        @select="$emit('select', $event)"
      />
    </template>
  </div>
</template>
