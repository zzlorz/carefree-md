<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { wordCount, charCount } from '@/lib/utils'

const store = useEditorStore()

const wc = computed(() => wordCount(store.content))
const cc = computed(() => charCount(store.content))

const modeLabel = computed(() => {
  const map = { edit: '编辑', split: '分屏', preview: '预览' }
  return map[store.mode]
})
</script>

<template>
  <footer class="flex items-center h-7 px-3 border-t border-border bg-muted/40 shrink-0 gap-4 text-[11px] text-muted-foreground select-none status-bar">
    <!-- Left: filename + dirty -->
    <span v-if="store.hasActiveFile" class="flex items-center gap-1.5">
      <span
        v-if="store.isDirty"
        class="w-2 h-2 rounded-full bg-foreground/40 shrink-0"
        title="未保存"
      />
      <span class="truncate max-w-48">{{ store.filename ?? store.draftTitle ?? '未命名' }}</span>
    </span>

    <div class="flex-1" />

    <!-- Center: cursor pos -->
    <span v-if="store.hasActiveFile && store.mode !== 'preview'">
      第 {{ store.cursorLine }} 行，第 {{ store.cursorCol }} 列
    </span>

    <!-- Right: word/char counts + mode -->
    <span>{{ wc }} 词</span>
    <span>{{ cc }} 字符</span>
    <span class="font-medium text-foreground/60">{{ modeLabel }}</span>
  </footer>
</template>
