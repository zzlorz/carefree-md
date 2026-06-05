import { useEditorStore } from '@/stores/editor'
import { useIDB } from '@/composables/useIDB'
import type { FileNode } from '@/types'

export function useFileSystem() {
  const store = useEditorStore()
  const idb = useIDB()

  async function openFile() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md', '.markdown'],
              'text/plain': ['.txt'],
            },
          },
        ],
        multiple: false,
      })
      const file = await handle.getFile()
      const text = await file.text()
      store.loadFile(file.name, text, handle)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Open file failed:', err)
      }
    }
  }

  async function saveFile() {
    if (store.fileHandle) {
      try {
        const writable = await store.fileHandle.createWritable()
        await writable.write(store.content)
        await writable.close()
        store.markSaved()
      } catch (err) {
        console.error('Save file failed:', err)
      }
    } else {
      await saveFileAs()
    }
  }

  async function saveFileAs() {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: store.filename ?? 'untitled.md',
        types: [
          {
            description: 'Markdown Files',
            accept: { 'text/markdown': ['.md', '.markdown'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(store.content)
      await writable.close()
      const file = await handle.getFile()
      store.fileHandle = handle
      store.filename = file.name
      store.markSaved()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Save as failed:', err)
      }
    }
  }

  async function openDirectory() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' })
      store.dirHandle = handle
      store.files = await readDirEntries(handle, '')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Open directory failed:', err)
      }
    }
  }

  async function readDirEntries(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string
  ): Promise<FileNode[]> {
    const entries: FileNode[] = []
    for await (const [name, handle] of dirHandle.entries()) {
      const path = basePath ? `${basePath}/${name}` : name
      if (handle.kind === 'file') {
        if (/\.(md|markdown|txt)$/i.test(name)) {
          entries.push({ name, path, kind: 'file', handle: handle as FileSystemFileHandle })
        }
      } else {
        entries.push({
          name,
          path,
          kind: 'directory',
          handle: handle as FileSystemDirectoryHandle,
          children: [],
          expanded: false,
        })
      }
    }
    return entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async function openFileFromTree(node: FileNode) {
    if (node.kind !== 'file') return
    const handle = node.handle as FileSystemFileHandle
    const file = await handle.getFile()
    const text = await file.text()
    store.loadFile(file.name, text, handle)
  }

  async function toggleDirectory(node: FileNode) {
    if (node.kind !== 'directory') return
    node.expanded = !node.expanded
    if (node.expanded && (!node.children || node.children.length === 0)) {
      node.children = await readDirEntries(
        node.handle as FileSystemDirectoryHandle,
        node.path
      )
    }
  }

  /** Create a fresh blank draft in IndexedDB then open it */
  async function newFile() {
    const id = await idb.createDraft()
    store.openNewDraft(id)
  }

  return {
    openFile,
    saveFile,
    saveFileAs,
    openDirectory,
    openFileFromTree,
    toggleDirectory,
    newFile,
  }
}
