<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Bold, Italic, Strikethrough, Underline,
  Code, Link, Quote, List, ListOrdered,
  Table2, Minus, MoreHorizontal,
} from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import HeadingPicker from './HeadingPicker.vue'
import CodeBlockPicker from './CodeBlockPicker.vue'

const store = useEditorStore()
const fmt = (cmd: string) => store.formatExecutor?.(cmd)

// ─── item definitions ───────────────────────────────────────────────────────
type BtnItem  = { kind: 'btn';       cmd: string; icon: unknown; title: string }
type SepItem  = { kind: 'sep' }
type HItem    = { kind: 'heading' }
type CBItem   = { kind: 'codeblock' }
type Item     = BtnItem | SepItem | HItem | CBItem

const ITEMS: Item[] = [
  { kind: 'heading' },
  { kind: 'sep' },
  { kind: 'btn', cmd: 'bold',          icon: Bold,          title: '加粗' },
  { kind: 'btn', cmd: 'italic',        icon: Italic,        title: '斜体' },
  { kind: 'btn', cmd: 'strikethrough', icon: Strikethrough, title: '删除线' },
  { kind: 'btn', cmd: 'underline',     icon: Underline,     title: '下划线' },
  { kind: 'sep' },
  { kind: 'btn', cmd: 'code',          icon: Code,          title: '行内代码' },
  { kind: 'btn', cmd: 'link',          icon: Link,          title: '链接' },
  { kind: 'codeblock' },
  { kind: 'sep' },
  { kind: 'btn', cmd: 'quote',         icon: Quote,         title: '引用' },
  { kind: 'btn', cmd: 'ul',            icon: List,          title: '无序列表' },
  { kind: 'btn', cmd: 'ol',            icon: ListOrdered,   title: '有序列表' },
  { kind: 'sep' },
  { kind: 'btn', cmd: 'table',         icon: Table2,        title: '表格' },
  { kind: 'btn', cmd: 'hr',            icon: Minus,         title: '分隔线' },
]

// width estimate in px for each kind
const PX: Record<Item['kind'], number> = {
  heading:   46,
  codeblock: 40,
  btn:       30,
  sep:        9,
}
const MORE_PX = 36

// ─── container width tracking ───────────────────────────────────────────────
const barEl   = ref<HTMLElement | null>(null)
const barWidth = ref(9999)
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => { barWidth.value = e.contentRect.width })
  if (barEl.value) ro.observe(barEl.value)
})
onUnmounted(() => ro?.disconnect())

// ─── split visible / hidden ─────────────────────────────────────────────────
const visibleItems = computed<Item[]>(() => {
  let used = 0
  const out: Item[] = []
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i]
    const w = PX[item.kind]
    const hasMore = ITEMS.slice(i + 1).some(x => x.kind !== 'sep')
    const budget = barWidth.value - (hasMore ? MORE_PX : 0)
    if (used + w <= budget) { used += w; out.push(item) }
    else break
  }
  // trim trailing separators
  while (out.length && out[out.length - 1].kind === 'sep') out.pop()
  return out
})

const hiddenItems = computed<Item[]>(() => {
  const vis = new Set(visibleItems.value)
  return ITEMS.filter(i => !vis.has(i) && i.kind !== 'sep')
})

// ─── "more" dropdown ────────────────────────────────────────────────────────
const moreOpen  = ref(false)
const moreBtnEl = ref<HTMLElement | null>(null)
const moreDropEl = ref<HTMLElement | null>(null)
const morePos   = ref({ top: '0px', left: '0px' })

async function toggleMore() {
  moreOpen.value = !moreOpen.value
  if (moreOpen.value) {
    await nextTick()
    const r = moreBtnEl.value?.getBoundingClientRect()
    if (r) morePos.value = { top: `${r.bottom + 4}px`, left: `${r.left}px` }
  }
}

function onOutside(e: MouseEvent) {
  const t = e.target as Node
  if (moreBtnEl.value?.contains(t) || moreDropEl.value?.contains(t)) return
  moreOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onOutside))
onUnmounted(() => document.removeEventListener('mousedown', onOutside))

function pickMore(cmd: string) { fmt(cmd); moreOpen.value = false }
</script>

<template>
  <div
    ref="barEl"
    class="flex items-center gap-0.5 h-9 border-b border-border bg-muted/20 shrink-0 overflow-hidden pr-2"
    style="padding-left: 52px"
  >
    <template v-for="(item, idx) in visibleItems" :key="idx">
      <div v-if="item.kind === 'sep'" class="w-px h-4 bg-border mx-0.5 shrink-0" />

      <HeadingPicker
        v-else-if="item.kind === 'heading'"
        @select="(l) => fmt(`heading:${l}`)"
      />
      <CodeBlockPicker
        v-else-if="item.kind === 'codeblock'"
        @select="(lang) => fmt(lang ? `codeblock:${lang}` : 'codeblock')"
      />
      <button
        v-else
        class="fmt-btn"
        :title="(item as BtnItem).title"
        @mousedown.prevent
        @click="fmt((item as BtnItem).cmd)"
      >
        <component :is="(item as BtnItem).icon" :size="15" />
      </button>
    </template>

    <!-- More -->
    <template v-if="hiddenItems.length">
      <div class="w-px h-4 bg-border mx-0.5 shrink-0" />
      <button
        ref="moreBtnEl"
        class="fmt-btn"
        title="更多"
        @mousedown.prevent
        @click="toggleMore"
      >
        <MoreHorizontal :size="15" />
      </button>

      <Teleport to="body">
        <div
          v-if="moreOpen"
          ref="moreDropEl"
          class="fixed z-[9999] w-44 rounded-lg border border-border bg-background shadow-xl py-1 overflow-hidden"
          :style="morePos"
        >
          <template v-for="(item, idx) in hiddenItems" :key="idx">
            <!-- Heading -->
            <template v-if="item.kind === 'heading'">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider px-3 pt-1.5 pb-1">标题</p>
              <div class="grid grid-cols-6 gap-1 px-2 pb-2">
                <button
                  v-for="l in [1,2,3,4,5,6]" :key="l"
                  class="text-[11px] font-bold py-1 rounded hover:bg-accent transition-colors"
                  @click="pickMore(`heading:${l}`)"
                >H{{ l }}</button>
              </div>
              <div class="border-t border-border" />
            </template>

            <!-- Codeblock -->
            <div v-else-if="item.kind === 'codeblock'" class="px-2 py-1.5">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">代码块</p>
              <CodeBlockPicker
                @select="(lang) => { pickMore(lang ? `codeblock:${lang}` : 'codeblock') }"
              />
            </div>

            <!-- Plain btn -->
            <button
              v-else
              class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-foreground/80
                     hover:text-foreground hover:bg-accent transition-colors"
              @mousedown.prevent
              @click="pickMore((item as BtnItem).cmd)"
            >
              <component :is="(item as BtnItem).icon" :size="14" class="shrink-0" />
              {{ (item as BtnItem).title }}
            </button>
          </template>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.fmt-btn {
  @apply p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0;
}
</style>
