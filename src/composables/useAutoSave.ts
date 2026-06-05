import { watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useIDB } from '@/composables/useIDB'

export function useAutoSave() {
  const store = useEditorStore()
  const idb = useIDB()
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(
    () => store.content,
    (newContent) => {
      if (!store.hasActiveFile) return

      // Only auto-save when there's an IDB draft to write to
      if (store.draftId === null) return

      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        if (store.draftId === null) return
        await idb.saveDraft(store.draftId, newContent)
      }, 1200)
    }
  )
}
