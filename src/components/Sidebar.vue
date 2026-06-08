<script setup lang="ts">
import { ref, computed } from 'vue'
import { FolderOpen, FileText, FilePlus, Trash2, Clock, X, Hash, ChevronRight } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useFileSystem } from '@/composables/useFileSystem'
import { useIDB, timeAgo } from '@/composables/useIDB'
import FileTreeNode from './FileTreeNode.vue'
import type { FileNode } from '@/types'

type Tab = 'files' | 'outline'
const activeTab = ref<Tab>('files')

const store = useEditorStore()
const fs = useFileSystem()
const { drafts, loadDraft: idbLoad, deleteDraft } = useIDB()

// ── outline logic ───────────────────────────────────────────────────────────
interface HeadingNode {
  level: number
  text: string
  line: number
  hasChildren?: boolean
}

const headings = computed<HeadingNode[]>(() => {
  const lines = store.content.split('\n')
  const result: HeadingNode[] = []
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/)
    if (match) {
      result.push({ level: match[1].length, text: match[2].trim(), line: i })
    }
  }
  // Mark nodes that have children
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i + 1].level > result[i].level) {
      result[i].hasChildren = true
    }
  }
  return result
})

const collapsedHeadings = ref<Set<number>>(new Set())

function toggleCollapse(idx: number) {
  if (collapsedHeadings.value.has(idx)) {
    collapsedHeadings.value.delete(idx)
  } else {
    collapsedHeadings.value.add(idx)
  }
}

function isVisible(idx: number): boolean {
  const current = headings.value[idx]
  // Walk backwards to find parent
  for (let i = idx - 1; i >= 0; i--) {
    const parent = headings.value[i]
    if (parent.level < current.level) {
      // This is a parent — if collapsed, hide current
      if (collapsedHeadings.value.has(i)) return false
      // Continue checking ancestors
      return isVisible(i)
    }
  }
  return true
}

function jumpTo(line: number) {
  store.outlineJumpTarget = line
}

// ── file / draft logic ──────────────────────────────────────────────────────

const editingId = ref<number | null>(null)
const editingTitle = ref('')

function isActiveDir(node: FileNode) {
  return node.kind === 'file' && store.filename === node.name
}

async function handleSelect(node: FileNode) {
  if (node.kind === 'file') {
    await fs.openFileFromTree(node)
  } else {
    await fs.toggleDirectory(node)
  }
}

async function openDraft(id: number) {
  const draft = await idbLoad(id)
  if (!draft) return
  store.loadDraft(draft.id, draft.content, draft.customTitle ?? draft.title)
}

function startEditing(draft: any, e: MouseEvent) {
  e.stopPropagation()
  editingId.value = draft.id
  editingTitle.value = draft.title
  requestAnimationFrame(() => {
    const input = (e.target as HTMLElement).closest('.group')?.querySelector('input')
    input?.focus()
    input?.select()
  })
}

async function saveTitle(id: number) {
  const newTitle = editingTitle.value.trim()
  if (!newTitle) { editingId.value = null; return }

  const req = indexedDB.open('carefree-md', 1)
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  const tx = db.transaction('drafts', 'readwrite')
  const idbStore = tx.objectStore('drafts')
  const draft = await new Promise((resolve) => {
    const get = idbStore.get(id)
    get.onsuccess = () => resolve(get.result)
  })

  if (draft) {
    (draft as any).title = newTitle
    ;(draft as any).customTitle = newTitle
    await new Promise((resolve) => {
      const put = idbStore.put(draft)
      put.onsuccess = () => resolve(null)
    })
  }

  db.close()

  const { refresh } = useIDB()
  await refresh()
  if (store.draftId === id) {
    store.draftTitle = newTitle
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
  editingTitle.value = ''
}


async function removeDraft(e: Event, id: number) {
  e.stopPropagation()
  const isActive = store.draftId === id
  await deleteDraft(id)
  if (isActive) store.closeFile()
}

function closeDirectory() {
  store.dirHandle = null
  store.files = []
}
</script>

<template>
  <aside class="flex flex-col h-full bg-muted/40 border-r border-border overflow-hidden select-none">

    <!-- Tab bar -->
    <div class="flex border-b border-border shrink-0">
      <button
        class="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium transition-colors"
        :class="activeTab === 'files' ? 'bg-background text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'"
        @click="activeTab = 'files'"
      >
        <FileText :size="12" />
        文件
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium transition-colors"
        :class="activeTab === 'outline' ? 'bg-background text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'"
        @click="activeTab = 'outline'"
      >
        <Hash :size="12" />
        大纲
      </button>
    </div>

    <!-- FILES TAB -->
    <template v-if="activeTab === 'files'">
      <!-- ── 草稿箱 section ── -->
    <div class="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
      <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Clock :size="11" />
        草稿箱
      </span>
      <button
        class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="新建草稿"
        @click="fs.newFile()"
      >
        <FilePlus :size="14" />
      </button>
    </div>

    <div class="overflow-y-auto py-1" :class="store.dirHandle ? 'max-h-[45%]' : 'flex-1'">
      <!-- Empty state -->
      <div
        v-if="drafts.length === 0"
        class="flex flex-col items-center justify-center py-8 gap-2 text-center px-4"
      >
        <FileText :size="24" class="text-muted-foreground/30" />
        <p class="text-xs text-muted-foreground/60">还没有草稿<br>点击 + 新建</p>
      </div>

      <!-- Draft rows -->
      <div
        v-for="draft in drafts"
        :key="draft.id"
        class="group flex items-start gap-2 px-3 py-2 cursor-pointer rounded-sm mx-1 transition-colors"
        :class="
          store.draftId === draft.id
            ? 'bg-accent text-foreground'
            : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground'
        "
        @click="editingId !== draft.id && openDraft(draft.id)"
      >
        <FileText
          :size="13"
          class="mt-0.5 shrink-0"
          :class="store.draftId === draft.id ? 'text-foreground' : 'text-muted-foreground'"
        />
        <div class="flex-1 min-w-0">
          <input
            v-if="editingId === draft.id"
            v-model="editingTitle"
            class="w-full text-[13px] font-medium leading-tight px-1 py-0.5 rounded
                   bg-background border border-border focus:outline-none focus:ring-1 focus:ring-black"
            @click.stop
            @keydown.enter="saveTitle(draft.id)"
            @keydown.esc="cancelEdit"
            @blur="saveTitle(draft.id)"
          />
          <p
            v-else
            class="text-[13px] truncate font-medium leading-tight"
            @dblclick="startEditing(draft, $event)"
          >{{ draft.title }}</p>
          <p class="text-[11px] text-muted-foreground/70 mt-0.5">{{ timeAgo(draft.updatedAt) }}</p>
        </div>
        <button
          class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-foreground transition-all shrink-0 mt-0.5"
          title="删除草稿"
          @click.stop="removeDraft($event, draft.id)"
        >
          <Trash2 :size="12" />
        </button>
      </div>
    </div>

    <!-- ── 文件夹 section (only when a directory is opened) ── -->
    <template v-if="store.dirHandle">
      <div class="flex items-center justify-between px-3 h-9 border-t border-b border-border shrink-0">
        <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1.5">
          <FolderOpen :size="12" class="shrink-0" />
          {{ store.dirHandle.name }}
        </span>
        <div class="flex items-center gap-0.5 shrink-0">
          <button
            class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="切换文件夹"
            @click="fs.openDirectory()"
          >
            <FolderOpen :size="13" />
          </button>
          <button
            class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="关闭文件夹"
            @click="closeDirectory()"
          >
            <X :size="13" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-1">
        <FileTreeNode
          v-for="node in store.files"
          :key="node.path"
          :node="node"
          :active="isActiveDir(node)"
          :depth="0"
          @select="handleSelect"
        />
        <div v-if="store.files.length === 0" class="px-4 py-6 text-center">
          <p class="text-xs text-muted-foreground">此目录中没有 Markdown 文件</p>
        </div>
      </div>
    </template>

    <!-- ── No folder: open folder prompt at the bottom ── -->
    <div v-else class="px-3 py-3 border-t border-border shrink-0">
      <button
        class="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        @click="fs.openDirectory()"
      >
        <FolderOpen :size="13" />
        打开本地文件夹…
      </button>
    </div>
    </template>

    <!-- OUTLINE TAB -->
    <div v-else class="flex-1 overflow-y-auto py-1">
      <div
        v-if="headings.length === 0"
        class="flex flex-col items-center justify-center py-12 gap-2 text-center px-4"
      >
        <Hash :size="28" class="text-muted-foreground/30" />
        <p class="text-xs text-muted-foreground/60">暂无标题</p>
      </div>

      <template v-for="(h, idx) in headings" :key="idx">
        <div
          v-if="isVisible(idx)"
          class="flex items-center hover:bg-accent transition-colors group rounded-sm mx-1"
        >
          <!-- Collapse toggle (only for parents) -->
          <button
            v-if="h.hasChildren"
            class="p-1 shrink-0 text-muted-foreground hover:text-foreground transition-transform"
            :class="{ 'rotate-90': !collapsedHeadings.has(idx) }"
            :style="{ marginLeft: `${h.level * 10}px` }"
            @click.stop="toggleCollapse(idx)"
          >
            <ChevronRight :size="12" />
          </button>
          <div v-else class="shrink-0" :style="{ width: `${12 + h.level * 10}px` }" />

          <!-- Heading text -->
          <button
            class="flex-1 text-left py-1.5 text-[13px] pr-2"
            @click="jumpTo(h.line)"
          >
            <span class="text-muted-foreground group-hover:text-foreground transition-colors truncate block">
              {{ h.text }}
            </span>
          </button>
        </div>
      </template>
    </div>

  </aside>
</template>
