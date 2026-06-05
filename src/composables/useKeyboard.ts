import { onMounted, onUnmounted } from 'vue'
import { useFileSystem } from './useFileSystem'
import { useEditorStore } from '@/stores/editor'

export function useKeyboard() {
  const store = useEditorStore()
  const fs = useFileSystem()

  function handler(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey

    if (ctrl && e.key === 's') {
      e.preventDefault()
      if (e.shiftKey) {
        fs.saveFileAs()
      } else {
        fs.saveFile()
      }
      return
    }

    if (ctrl && e.key === 'o') {
      e.preventDefault()
      fs.openFile()
      return
    }

    if (ctrl && e.key === 'n') {
      e.preventDefault()
      if (store.isDirty) {
        if (confirm('有未保存的更改，确定要新建文件吗？')) {
          fs.newFile()
        }
      } else {
        fs.newFile()
      }
      return
    }

    if (ctrl && e.key === '\\') {
      e.preventDefault()
      store.sidebarOpen = !store.sidebarOpen
      return
    }

    if (ctrl && e.key === '1') {
      e.preventDefault()
      store.mode = 'edit'
      return
    }

    if (ctrl && e.key === '2') {
      e.preventDefault()
      store.mode = 'split'
      return
    }

    if (ctrl && e.key === '3') {
      e.preventDefault()
      store.mode = 'preview'
      return
    }
  }

  function beforeUnload(e: BeforeUnloadEvent) {
    if (store.isDirty) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handler)
    window.addEventListener('beforeunload', beforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handler)
    window.removeEventListener('beforeunload', beforeUnload)
  })
}
