import { openDB } from './db'

export interface ImageRecord {
  id: string          // e.g. "file_abc12345"
  draftId: number     // -1 for single-file mode fallback
  mimeType: string
  data: Blob
  createdAt: number
}

const STORE = 'images'

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function imageDbSave(record: ImageRecord): Promise<void> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readwrite')
  await idbReq(t.objectStore(STORE).put(record))
}

export async function imageDbGet(id: string): Promise<ImageRecord | undefined> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readonly')
  return idbReq<ImageRecord | undefined>(t.objectStore(STORE).get(id))
}

export async function imageDbList(draftId: number): Promise<ImageRecord[]> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readonly')
  const index = t.objectStore(STORE).index('draftId')
  return idbReq<ImageRecord[]>(index.getAll(draftId))
}

export async function imageDbDelete(id: string): Promise<void> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readwrite')
  await idbReq(t.objectStore(STORE).delete(id))
}

export async function imageDbDeleteByDraft(draftId: number): Promise<void> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readwrite')
  const index = t.objectStore(STORE).index('draftId')
  const keys = await idbReq<string[]>(index.getAllKeys(draftId) as IDBRequest<string[]>)
  await Promise.all(keys.map(k => idbReq(t.objectStore(STORE).delete(k))))
}
