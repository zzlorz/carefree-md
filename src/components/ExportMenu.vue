<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { FileInput, FileText, FileCode, FileType2, Loader2 } from 'lucide-vue-next'
import { useExport } from '@/composables/useExport'

const { exportHTML, exportPDF, exportDOCX } = useExport()

const open = ref(false)
const loading = ref<string | null>(null)
const btnEl = ref<HTMLElement | null>(null)
const dropEl = ref<HTMLElement | null>(null)
const pos = ref<Record<string, string>>({ top: '0px', left: '0px' })

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    const rect = btnEl.value?.getBoundingClientRect()
    if (!rect) return
    const DROPDOWN_W = 160
    const overflowsRight = rect.left + DROPDOWN_W > window.innerWidth - 8
    pos.value = overflowsRight
      ? { top: `${rect.bottom + 4}px`, right: `${window.innerWidth - rect.right}px` }
      : { top: `${rect.bottom + 4}px`, left: `${rect.left}px` }
  }
}

async function run(type: 'html' | 'pdf' | 'docx') {
  loading.value = type
  open.value = false
  try {
    if (type === 'html') await exportHTML()
    else if (type === 'pdf') await exportPDF()
    else await exportDOCX()
  } finally {
    loading.value = null
  }
}

function onOutside(e: MouseEvent) {
  const t = e.target as Node
  if (btnEl.value?.contains(t) || dropEl.value?.contains(t)) return
  open.value = false
}

onMounted(() => document.addEventListener('mousedown', onOutside))
onUnmounted(() => document.removeEventListener('mousedown', onOutside))
</script>

<template>
  <div ref="btnEl">
    <button
      class="toolbar-btn flex items-center gap-0.5"
      title="导出"
      @click="toggle"
    >
      <Loader2 v-if="loading" :size="16" class="animate-spin" />
      <FileInput v-else :size="16" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="dropEl"
        class="fixed z-[9999] w-40 rounded-lg border border-border bg-background shadow-xl py-1 overflow-hidden"
        :style="pos"
      >
        <p class="text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-1.5">导出为</p>

        <button
          class="export-item"
          @click="run('pdf')"
        >
          <FileText :size="14" class="shrink-0" />
          PDF
        </button>
        <button
          class="export-item"
          @click="run('html')"
        >
          <FileCode :size="14" class="shrink-0" />
          HTML
        </button>
        <!-- <button
          class="export-item"
          @click="run('docx')"
        >
          <FileType2 :size="14" class="shrink-0" />
          Word
        </button> -->
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors;
}
.export-item {
  @apply flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground/80
         hover:text-foreground hover:bg-accent transition-colors;
}
</style>
