<script setup lang="ts">
import { computed } from 'vue'
import { Hash } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()

interface HeadingNode {
  level: number    // 1-6
  text: string
  line: number     // line number in editor (0-indexed)
}

const headings = computed<HeadingNode[]>(() => {
  const lines = store.content.split('\n')
  const result: HeadingNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/)
    if (match) {
      result.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i,
      })
    }
  }

  return result
})

function jumpTo(line: number) {
  // Emit event to parent/editor to scroll to this line
  store.outlineJumpTarget = line
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex items-center px-3 h-9 border-b border-border shrink-0">
      <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Hash :size="11" />
        大纲
      </span>
    </div>

    <div class="flex-1 overflow-y-auto py-1">
      <div
        v-if="headings.length === 0"
        class="flex flex-col items-center justify-center py-8 gap-2 text-center px-4"
      >
        <Hash :size="24" class="text-muted-foreground/30" />
        <p class="text-xs text-muted-foreground/60">暂无标题</p>
      </div>

      <button
        v-for="(h, idx) in headings"
        :key="idx"
        class="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors group"
        :style="{ paddingLeft: `${8 + h.level * 12}px` }"
        @click="jumpTo(h.line)"
      >
        <span class="text-muted-foreground group-hover:text-foreground transition-colors truncate block">
          {{ h.text }}
        </span>
      </button>
    </div>
  </div>
</template>
