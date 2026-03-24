const DB_NAME = 'memory-of-memories.photos'
const DB_VERSION = 1
const STORE = 'photos'

export type PhotoRecord = {
  id: number
  blob: Blob
  name: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function loadAllPhotos(): Promise<PhotoRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const rows = (req.result as PhotoRecord[]).slice().sort((a, b) => a.id - b.id)
      resolve(rows)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
  })
}

export async function appendImageFiles(files: File[]): Promise<void> {
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (images.length === 0) return

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const file of images) {
      store.add({ blob: file, name: file.name })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
  })
}

export async function clearPersistedPhotos(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'))
  })
}
