import { reactive, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { imageDbSave, imageDbGet, imageDbList, imageDbDeleteByDraft } from '@/lib/imageDb'
import { compressImage, generateImageId, mimeToExt } from '@/lib/imageUtils'

// Module-level singleton so blobCache is shared across all component instances
const blobCache = reactive(new Map<string, string>())
let _initialized = false

// Regex to find all image references in markdown content
const IMG_IDB_RE  = /!\[[^\]]*\]\((img:\/\/[^)]+)\)/g
const IMG_FILE_RE = /!\[[^\]]*\]\((\.\/assets\/[^)]+)\)/g

async function warmCache(content: string, store: ReturnType<typeof useEditorStore>): Promise<void> {
  const found = new Set<string>()

  // Collect all img:// references
  for (const m of content.matchAll(IMG_IDB_RE)) {
    found.add(m[1])
  }

  // Collect all ./assets/ references
  for (const m of content.matchAll(IMG_FILE_RE)) {
    found.add(m[1])
  }

  // Fetch missing entries
  for (const src of found) {
    if (blobCache.has(src)) continue

    if (src.startsWith('img://')) {
      const id = src.slice(6)
      const record = await imageDbGet(id)
      if (record) {
        blobCache.set(src, URL.createObjectURL(record.data))
      }
    } else if (src.startsWith('./assets/') && store.dirHandle) {
      try {
        const assetsDir = await store.dirHandle.getDirectoryHandle('assets')
        const filename = src.replace('./assets/', '')
        const fileHandle = await assetsDir.getFileHandle(filename)
        const file = await fileHandle.getFile()
        blobCache.set(src, URL.createObjectURL(file))
      } catch {
        // File might not exist yet
      }
    }
  }

  // Revoke stale entries no longer in content
  for (const [src, blobUrl] of blobCache.entries()) {
    if (!found.has(src)) {
      URL.revokeObjectURL(blobUrl)
      blobCache.delete(src)
    }
  }
}

function clearCache() {
  for (const blobUrl of blobCache.values()) {
    URL.revokeObjectURL(blobUrl)
  }
  blobCache.clear()
}

async function getOrCreateAssetsDir(store: ReturnType<typeof useEditorStore>): Promise<FileSystemDirectoryHandle> {
  return store.dirHandle!.getDirectoryHandle('assets', { create: true })
}

export function useImageManager() {
  const store = useEditorStore()

  // Set up module-level watcher once
  if (!_initialized) {
    _initialized = true
    watch(
      () => store.content,
      (content) => warmCache(content, store),
      { immediate: true }
    )
    watch(
      () => store.hasActiveFile,
      (active) => { if (!active) clearCache() }
    )
  }

  /**
   * Handle an image file from paste or drop.
   * Returns the markdown syntax string to insert.
   */
  async function handleImageFile(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Not an image file')
    }

    const blob = await compressImage(file)

    // Track 2: folder is open → write to assets/ on disk
    if (store.dirHandle) {
      const assetsDir = await getOrCreateAssetsDir(store)
      const id = generateImageId()
      const ext = mimeToExt(blob.type)
      const filename = `${id}.${ext}`
      const fileHandle = await assetsDir.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      const src = `./assets/${filename}`
      blobCache.set(src, URL.createObjectURL(blob))
      const alt = file.name.replace(/\.[^.]+$/, '') || 'image'
      return `![${alt}](${src})`
    }

    // Track 1: draft or single file → store in IDB
    const draftId = store.draftId ?? -1  // -1 = single-file fallback bucket
    const id = generateImageId()
    await imageDbSave({
      id,
      draftId,
      mimeType: blob.type,
      data: blob,
      createdAt: Date.now(),
    })
    const src = `img://${id}`
    blobCache.set(src, URL.createObjectURL(blob))
    const alt = file.name.replace(/\.[^.]+$/, '') || 'image'
    return `![${alt}](${src})`
  }

  /**
   * Synchronously resolve an image src to a blob URL.
   * Returns the original src if no blob URL is cached.
   */
  function resolveSrc(src: string): string {
    return blobCache.get(src) ?? src
  }

  return {
    blobCache,
    handleImageFile,
    resolveSrc,
    clearCache,
    warmCache: (content: string) => warmCache(content, store),
    imageDbList,
    imageDbDeleteByDraft,
  }
}
