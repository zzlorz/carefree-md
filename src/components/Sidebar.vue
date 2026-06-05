<script setup lang="ts">
import { FolderOpen, FileText, FilePlus, Trash2, Clock, X } from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useFileSystem } from '@/composables/useFileSystem'
import { useIDB, timeAgo } from '@/composables/useIDB'
import FileTreeNode from './FileTreeNode.vue'
import type { FileNode } from '@/types'

const store = useEditorStore()
const fs = useFileSystem()
const { drafts, loadDraft: idbLoad, deleteDraft } = useIDB()

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
  store.loadDraft(draft.id, draft.content)
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
        @click="openDraft(draft.id)"
      >
        <FileText
          :size="13"
          class="mt-0.5 shrink-0"
          :class="store.draftId === draft.id ? 'text-blue-500' : 'text-muted-foreground'"
        />
        <div class="flex-1 min-w-0">
          <p class="text-[13px] truncate font-medium leading-tight">{{ draft.title }}</p>
          <p class="text-[11px] text-muted-foreground/70 mt-0.5">{{ timeAgo(draft.updatedAt) }}</p>
        </div>
        <button
          class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-red-500 transition-all shrink-0 mt-0.5"
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
            class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
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

  </aside>
</template>
