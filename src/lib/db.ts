export interface Draft {
  id: number
  title: string
  content: string
  updatedAt: number
  customTitle?: string  // User-renamed title; takes precedence over auto-derived
}

const DB_NAME = 'carefree-md'
const DB_VERSION = 1
const STORE = 'drafts'

// Keep the connection open for the page lifetime
let _dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        os.createIndex('updatedAt', 'updatedAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IDB blocked'))
  })
  return _dbPromise
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function dbCreateDraft(content: string, title: string): Promise<number> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readwrite')
  const id = await idbReq<number>(t.objectStore(STORE).add({ title, content, updatedAt: Date.now() }))
  return id
}

export async function dbSaveDraft(
  id: number,
  content: string,
  title: string,
  customTitle?: string
): Promise<void> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readwrite')
  const draft: any = { id, title, content, updatedAt: Date.now() }
  if (customTitle !== undefined) draft.customTitle = customTitle
  await idbReq(t.objectStore(STORE).put(draft))
}

export async function dbGetDraft(id: number): Promise<Draft | undefined> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readonly')
  return idbReq<Draft | undefined>(t.objectStore(STORE).get(id))
}

export async function dbListDrafts(): Promise<Draft[]> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readonly')
  const list = await idbReq<Draft[]>(t.objectStore(STORE).getAll())
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function dbDeleteDraft(id: number): Promise<void> {
  const db = await openDB()
  const t = db.transaction(STORE, 'readwrite')
  await idbReq(t.objectStore(STORE).delete(id))
}
