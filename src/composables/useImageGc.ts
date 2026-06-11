import { onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { dbListDrafts, dbGetDraft } from '@/lib/db'
import { imageDbList, imageDbDelete } from '@/lib/imageDb'

const IMG_IDB_RE = /!\[[^\]]*\]\(img:\/\/(file_[^)]+)\)/g

function extractImageIds(content: string): Set<string> {
  const ids = new Set<string>()
  for (const m of content.matchAll(IMG_IDB_RE)) {
    ids.add(m[1])
  }
  return ids
}

async function gcDraft(draftId: number): Promise<number> {
  const draft = await dbGetDraft(draftId)
  if (!draft) return 0

  const referenced = extractImageIds(draft.content)
  const stored = await imageDbList(draftId)
  const orphans = stored.filter(img => !referenced.has(img.id))

  await Promise.all(orphans.map(img => imageDbDelete(img.id)))
  return orphans.length
}

export function useImageGc(intervalMs = 5 * 60 * 1000) {
  const store = useEditorStore()
  let timer: ReturnType<typeof setInterval> | null = null

  async function runGc() {
    const drafts = await dbListDrafts()
    for (const draft of drafts) {
      // Skip the draft currently open in the editor — it may have unsaved changes
      if (draft.id === store.draftId) continue
      await gcDraft(draft.id)
    }
  }

  function start() {
    if (timer !== null) return
    timer = setInterval(runGc, intervalMs)
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stop)

  return { start, stop, runGc }
}
