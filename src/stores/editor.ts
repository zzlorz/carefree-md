import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { FileNode, EditorMode, Theme } from '@/types'

export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const filename = ref<string | null>(null)
  const fileHandle = ref<FileSystemFileHandle | null>(null)
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null)
  const files = ref<FileNode[]>([])
  const mode = ref<EditorMode>('split')
  const isDirty = ref(false)
  const sidebarOpen = ref(true)
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) ?? 'light')

  const hasActiveFile = ref(false)
  const formatExecutor = ref<((cmd: string) => void) | null>(null)
  const cursorLine = ref(1)
  const cursorCol = ref(1)

  /**
   * ID of the current IndexedDB draft (null when editing a pure disk file
   * that was never saved as a draft).
   */
  const draftId = ref<number | null>(null)

  const title = computed(() => {
    if (!filename.value) return 'Carefree MD'
    return `${isDirty.value ? '● ' : ''}${filename.value} — Carefree MD`
  })

  function setContent(newContent: string) {
    if (content.value !== newContent) {
      content.value = newContent
      // Only dirty-flag disk-backed files; IDB drafts auto-save
      if (fileHandle.value !== null) {
        isDirty.value = true
      }
    }
  }

  /** Open a disk file — clears draftId (file is its own persistence) */
  function loadFile(name: string, text: string, handle: FileSystemFileHandle) {
    content.value = text
    filename.value = name
    fileHandle.value = handle
    isDirty.value = false
    hasActiveFile.value = true
    draftId.value = null
  }

  /** Load an IndexedDB draft into the editor */
  function loadDraft(id: number, text: string, name: string | null = null) {
    content.value = text
    filename.value = name
    fileHandle.value = null
    isDirty.value = false
    hasActiveFile.value = true
    draftId.value = id
  }

  /**
   * Open a blank editing session that is backed by an IDB draft.
   * The caller must supply the newly-created draft id.
   */
  function openNewDraft(id: number) {
    content.value = ''
    filename.value = null
    fileHandle.value = null
    isDirty.value = false
    hasActiveFile.value = true
    draftId.value = id
  }

  function closeFile() {
    content.value = ''
    filename.value = null
    fileHandle.value = null
    isDirty.value = false
    hasActiveFile.value = false
    draftId.value = null
  }

  function markSaved() {
    isDirty.value = false
  }

  function setTheme(t: Theme) {
    theme.value = t
    localStorage.setItem('theme', t)
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function initTheme() {
    if (theme.value === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }

  return {
    content,
    filename,
    fileHandle,
    dirHandle,
    files,
    mode,
    isDirty,
    sidebarOpen,
    theme,
    cursorLine,
    cursorCol,
    title,
    hasActiveFile,
    formatExecutor,
    draftId,
    setContent,
    loadFile,
    loadDraft,
    openNewDraft,
    closeFile,
    markSaved,
    setTheme,
    initTheme,
  }
})
