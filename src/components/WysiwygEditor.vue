<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'
import { useImageManager } from '@/composables/useImageManager'
import { parseBlocks, assembleContent, type Block } from '@/lib/blockParser'

const store = useEditorStore()
const { resolveSrc, blobCache } = useImageManager()
const { render } = useMarkdown(resolveSrc)

const blocks = ref<Block[]>([])
const focusedId = ref<number | null>(null)
const editableRefs = ref<Record<number, HTMLElement>>({})

const fileKey = computed(() => `${store.draftId}::${store.filename}`)

function loadBlocks(content: string) {
  blocks.value = parseBlocks(content)
  focusedId.value = null
}

onMounted(() => loadBlocks(store.content))
watch(fileKey, () => loadBlocks(store.content))

function syncToStore() {
  store.setContent(assembleContent(blocks.value))
}

function renderBlock(b: Block): string {
  void blobCache.size
  if (b.type === 'blank') return '<br>'
  return render(b.raw)
}

async function focusBlock(id: number) {
  focusedId.value = id
  await nextTick()
  const el = editableRefs.value[id]
  if (!el) return
  el.focus()
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(false)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function blurBlock(id: number, el: HTMLElement) {
  const raw = (el.textContent ?? '').replace(/ /g, ' ')
  const b = blocks.value.find(x => x.id === id)
  if (b) { b.raw = raw; syncToStore() }
  setTimeout(() => {
    if (focusedId.value === id) focusedId.value = null
  }, 80)
}

function onInput(id: number, el: HTMLElement) {
  const raw = (el.textContent ?? '').replace(/ /g, ' ')
  const b = blocks.value.find(x => x.id === id)
  if (b) { b.raw = raw; syncToStore() }
}

function onBeforeInput(e: InputEvent) {
  if (e.inputType === 'insertFromPaste') {
    e.preventDefault()
    const text = (e as any).dataTransfer?.getData('text/plain') ?? ''
    document.execCommand('insertText', false, text)
  }
}

function onKeydown(e: KeyboardEvent, id: number) {
  const b = blocks.value.find(x => x.id === id)
  if (!b) return

  // Esc: exit to rendered view
  if (e.key === 'Escape') {
    e.preventDefault()
    focusedId.value = null
    return
  }

  // Enter (no modifier): insert a real newline within the block
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    document.execCommand('insertText', false, '\n')
    return
  }

  // Shift+Enter: commit current block + create a new paragraph block after it
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault()
    const el = editableRefs.value[id]
    if (el) b.raw = (el.textContent ?? '').replace(/ /g, ' ')
    const idx = blocks.value.findIndex(x => x.id === id)
    const newId = Date.now()
    blocks.value.splice(idx + 1, 0, { id: newId, raw: '', type: 'paragraph' })
    syncToStore()
    nextTick(() => focusBlock(newId))
    return
  }

  // Backspace on empty block: remove and focus previous
  if (e.key === 'Backspace') {
    const el = editableRefs.value[id]
    if (!el?.textContent?.trim()) {
      e.preventDefault()
      const idx = blocks.value.findIndex(x => x.id === id)
      if (idx > 0) {
        blocks.value.splice(idx, 1)
        syncToStore()
        nextTick(() => focusBlock(blocks.value[Math.max(0, idx - 1)].id))
      }
    }
  }
}

function setRef(id: number, el: HTMLElement | null) {
  if (el) {
    editableRefs.value[id] = el
    const b = blocks.value.find(x => x.id === id)
    if (b) el.textContent = b.raw
  } else {
    delete editableRefs.value[id]
  }
}

function appendBlock() {
  const id = Date.now()
  blocks.value.push({ id, raw: '', type: 'paragraph' })
  nextTick(() => focusBlock(id))
}

function onDocClick(e: MouseEvent) {
  const wrapper = document.getElementById('wysiwyg-wrapper')
  if (wrapper && !wrapper.contains(e.target as Node)) {
    focusedId.value = null
  }
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div class="h-full overflow-y-auto bg-background">
    <div id="wysiwyg-wrapper" class="max-w-[780px] mx-auto px-16 py-10 pb-24">

      <div v-for="block in blocks" :key="block.id" class="relative my-0.5">

        <div
          v-if="focusedId === block.id"
          :ref="(el) => setRef(block.id, el as HTMLElement)"
          contenteditable="true"
          spellcheck="false"
          class="source-view"
          @input="onInput(block.id, $event.target as HTMLElement)"
          @blur="blurBlock(block.id, $event.target as HTMLElement)"
          @keydown="onKeydown($event, block.id)"
          @beforeinput="onBeforeInput($event as InputEvent)"
        />

        <div
          v-else
          class="rendered-block markdown-body"
          style="padding:0; max-width:100%;"
          v-html="renderBlock(block)"
          @click="focusBlock(block.id)"
        />
      </div>

      <div class="h-20 cursor-text" @click="appendBlock" />
    </div>
  </div>
</template>

<style scoped>
.source-view {
  display: block;
  width: 100%;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.75;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 0.5);
  border-radius: 6px;
  padding: 4px 8px;
  caret-color: hsl(var(--foreground));
  min-height: 1.75rem;
}

.rendered-block {
  cursor: text;
  border-radius: 4px;
  padding: 2px 8px !important;
  transition: background 0.1s;
  min-height: 1.5rem;
}
.rendered-block:hover {
  background: hsl(var(--muted) / 0.4);
}

.rendered-block :deep(h1),
.rendered-block :deep(h2),
.rendered-block :deep(h3),
.rendered-block :deep(h4),
.rendered-block :deep(h5),
.rendered-block :deep(h6) { margin-top: 0.1em; margin-bottom: 0.1em; }
.rendered-block :deep(p)  { margin: 0; }
.rendered-block :deep(pre),
.rendered-block :deep(blockquote),
.rendered-block :deep(ul),
.rendered-block :deep(ol),
.rendered-block :deep(table) { margin-top: 0.2em; margin-bottom: 0.2em; }
</style>
