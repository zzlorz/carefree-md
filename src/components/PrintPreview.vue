<script setup lang="ts">
import { computed } from 'vue'
import { X, Printer, FileText } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'

const store = useEditorStore()
const { render } = useMarkdown()
const emit = defineEmits<{ (e: 'close'): void }>()

const rendered = computed(() => render(store.content))

// Collect all CSS rules from current page stylesheets
function collectStyles(): string {
  return Array.from(document.styleSheets)
    .flatMap(sheet => {
      try {
        return Array.from(sheet.cssRules).map(r => r.cssText)
      } catch {
        return []
      }
    })
    .join('\n')
}

function doPrint() {
  const styles = collectStyles()

  // Build full HTML document for the iframe
  const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${store.filename ?? 'Carefree MD'}</title>
  <style>
    ${styles}
    * { box-sizing: border-box; }
    body {
      background: #fff !important;
      color: #24292f !important;
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .markdown-body {
      max-width: 100%;
      margin: 0 auto;
      padding: 20mm;
    }
    @media print {
      @page { margin: 15mm 20mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      pre { page-break-inside: avoid; }
      h1,h2,h3,h4,h5,h6 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="markdown-body">${rendered.value}</div>
</body>
</html>`

  // Create hidden iframe, print from it
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
  document.body.appendChild(iframe)

  const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!iDoc) return

  iDoc.open()
  iDoc.write(doc)
  iDoc.close()

  // Wait for resources to load then print
  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    // Clean up after print dialog closes
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }
}
</script>

<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[9998] flex items-start justify-center py-6 px-4"
      @click.self="emit('close')"
    >
      <!-- Modal: scrollable preview left + fixed actions right -->
      <div class="flex w-full max-w-4xl max-h-[90vh] rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden ring-1 ring-black/10">

        <!-- Left: scrollable preview -->
        <div class="flex-1 overflow-y-auto bg-white">
          <!-- A4-like page shadow -->
          <div class="min-h-full px-16 py-12">
            <div
              class="markdown-body"
              style="color: #24292f; max-width: 100%;"
              v-html="rendered"
            />
          </div>
        </div>

        <!-- Right: fixed action panel -->
        <div class="shrink-0 w-44 bg-background border-l border-border flex flex-col items-start gap-3 p-4">
          <!-- Title -->
          <div class="flex items-center gap-1.5 text-foreground mb-1 min-w-0 w-full">
            <FileText :size="14" class="shrink-0 text-muted-foreground" />
            <span class="text-xs text-muted-foreground truncate">{{ store.filename ?? '未命名' }}</span>
          </div>

          <!-- Print button -->
          <button
            class="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-foreground text-background
                   text-sm font-medium hover:opacity-90 transition-opacity"
            @click="doPrint"
          >
            <Printer :size="15" />
            打印
          </button>

          <!-- Close button -->
          <button
            class="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border
                   hover:bg-accent text-sm text-foreground/70 hover:text-foreground transition-colors"
            @click="emit('close')"
          >
            <X :size="15" />
            关闭
          </button>

          <div class="mt-auto text-[11px] text-muted-foreground/50 leading-relaxed">
            点击「打印」将调出浏览器打印对话框，可选择保存为 PDF。
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
