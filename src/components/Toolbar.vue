<script setup lang="ts">
import { ref } from 'vue'
import {
  PanelLeft,
  FilePlus,
  FolderOpen,
  Save,
  Printer,
  Columns2,
  FileText,
  Eye,
  Moon,
  Sun,
  X,
} from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useFileSystem } from '@/composables/useFileSystem'
import PrintPreview from '@/components/PrintPreview.vue'
import ExportMenu from '@/components/ExportMenu.vue'
import type { EditorMode } from '@/types'

const store = useEditorStore()
const fs = useFileSystem()
const showPrint = ref(false)

const modes: { id: EditorMode; label: string; icon: unknown }[] = [
  { id: 'edit', label: '编辑', icon: FileText },
  { id: 'split', label: '分屏', icon: Columns2 },
  { id: 'preview', label: '预览', icon: Eye },
]

function setMode(m: EditorMode) {
  store.mode = m
}

function handleClose() {
  if (store.isDirty && !confirm('有未保存的更改，确定要关闭文件吗？')) return
  store.closeFile()
}
</script>

<template>
  <header class="relative flex items-center h-11 px-2 border-b border-border bg-background/95 backdrop-blur-sm gap-1 shrink-0">
    <!-- Sidebar toggle -->
    <button
      class="toolbar-btn"
      title="切换侧边栏 (Ctrl+\\)"
      @click="store.sidebarOpen = !store.sidebarOpen"
    >
      <PanelLeft :size="16" />
    </button>

    <div class="w-px h-5 bg-border mx-1" />

    <!-- File operations -->
    <button class="toolbar-btn" title="新建 (Ctrl+N)" @click="fs.newFile()">
      <FilePlus :size="16" />
    </button>
    <button class="toolbar-btn" title="打开 (Ctrl+O)" @click="fs.openFile()">
      <FolderOpen :size="16" />
    </button>
    <button
      class="toolbar-btn"
      :class="{ 'text-foreground': store.isDirty }"
      title="保存 (Ctrl+S)"
      @click="fs.saveFile()"
    >
      <Save :size="16" />
    </button>

    <!-- Current file chip + close button -->
    <div v-if="store.hasActiveFile" class="flex items-center gap-1 ml-1">
      <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-xs text-foreground/70 max-w-48">
        <span
          v-if="store.isDirty"
          class="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0"
          title="未保存"
        />
        <span class="truncate">{{ store.filename ?? store.draftTitle ?? '未命名' }}</span>
      </div>
      <button
        class="toolbar-btn !p-1"
        title="关闭文件"
        @click="handleClose"
      >
        <X :size="14" />
      </button>
    </div>

    <div class="flex-1" />

    <!-- App name: absolutely centered so it's always at the true midpoint -->
    <span class="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-foreground/60 tracking-tight select-none pointer-events-none">
      Carefree MD
    </span>

    <div class="flex-1" />

    <!-- View mode pills -->
    <div class="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
      <button
        v-for="m in modes"
        :key="m.id"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all"
        :class="
          store.mode === m.id
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="setMode(m.id)"
      >
        <component :is="m.icon" :size="12" />
        {{ m.label }}
      </button>
    </div>

    <div class="w-px h-5 bg-border mx-1" />

    <!-- Print + Export -->
    <button class="toolbar-btn" title="打印预览" @click="showPrint = true">
      <Printer :size="16" />
    </button>
    <ExportMenu />

    <div class="w-px h-5 bg-border mx-1" />

    <!-- Theme toggle -->
    <button
      class="toolbar-btn"
      :title="store.theme === 'dark' ? '切换亮色' : '切换暗色'"
      @click="store.setTheme(store.theme === 'dark' ? 'light' : 'dark')"
    >
      <Moon v-if="store.theme === 'light'" :size="16" />
      <Sun v-else :size="16" />
    </button>
  </header>

  <!-- Print Preview Modal -->
  <PrintPreview v-if="showPrint" @close="showPrint = false" />
</template>

<style scoped>
.toolbar-btn {
  @apply p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors;
}
</style>
