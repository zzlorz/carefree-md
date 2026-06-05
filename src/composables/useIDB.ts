import { ref, readonly } from 'vue'
import {
  dbCreateDraft,
  dbSaveDraft,
  dbGetDraft,
  dbListDrafts,
  dbDeleteDraft,
  type Draft,
} from '@/lib/db'

// ── module-level singleton so all composable calls share the same list ──
const drafts = ref<Draft[]>([])
let _loaded = false

async function refresh() {
  drafts.value = await dbListDrafts()
  _loaded = true
}

// Kick off the initial load once
if (!_loaded) refresh()

// Extract a human-readable title from markdown content
export function deriveTitle(content: string): string {
  const firstLine = content.split('\n').find((l) => l.trim()) ?? ''
  const stripped = firstLine.replace(/^#+\s*/, '').trim()
  return stripped.slice(0, 60) || '未命名'
}

// Relative time label
export function timeAgo(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000) return '刚刚'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} 分钟前`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} 小时前`
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

export function useIDB() {
  /** Create a brand-new draft, return its id */
  async function createDraft(): Promise<number> {
    const id = await dbCreateDraft('', '未命名')
    await refresh()
    return id
  }

  /** Persist changes to an existing draft */
  async function saveDraft(id: number, content: string): Promise<void> {
    await dbSaveDraft(id, content, deriveTitle(content))
    await refresh()
  }

  /** Load full content of a draft by id */
  async function loadDraft(id: number): Promise<Draft | undefined> {
    return dbGetDraft(id)
  }

  /** Remove a draft */
  async function deleteDraft(id: number): Promise<void> {
    await dbDeleteDraft(id)
    await refresh()
  }

  return {
    /** Reactive sorted-by-recency list */
    drafts: readonly(drafts),
    refresh,
    createDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    deriveTitle,
    timeAgo,
  }
}
