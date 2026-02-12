import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  OFFLINE_CONFIG,
  STORE_NAMES,
  Draft,
  SyncQueueItem,
  MetadataItem,
  StorageUsage,
} from "./types";

interface OfflineDBSchema extends DBSchema {
  drafts: {
    key: string;
    value: Draft;
    indexes: {
      "by-user": string;
      "by-expires": number;
      "by-type": string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      "by-status": string;
      "by-user": string;
      "by-created": number;
    };
  };
  metadata: {
    key: string;
    value: MetadataItem;
  };
}

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;
let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is not available on server");
  }

  if (dbInstance) return dbInstance;

  if (dbPromise) return dbPromise;

  dbPromise = openDB<OfflineDBSchema>(
    OFFLINE_CONFIG.DB_NAME,
    OFFLINE_CONFIG.DB_VERSION,
    {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAMES.DRAFTS)) {
          const draftStore = db.createObjectStore(STORE_NAMES.DRAFTS, {
            keyPath: "id",
          });
          draftStore.createIndex("by-user", "userId");
          draftStore.createIndex("by-expires", "expiresAt");
          draftStore.createIndex("by-type", "type");
        }

        if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORE_NAMES.SYNC_QUEUE, {
            keyPath: "id",
          });
          syncStore.createIndex("by-status", "status");
          syncStore.createIndex("by-user", "userId");
          syncStore.createIndex("by-created", "createdAt");
        }

        if (!db.objectStoreNames.contains(STORE_NAMES.METADATA)) {
          db.createObjectStore(STORE_NAMES.METADATA, { keyPath: "key" });
        }
      },
      blocked() {
        console.warn("[OfflineDB] Database upgrade blocked by other tabs");
      },
      blocking() {
        dbInstance?.close();
        dbInstance = null;
      },
      terminated() {
        dbInstance = null;
        dbPromise = null;
      },
    }
  );

  const db = await dbPromise;
  dbInstance = db;
  return db;
}

export async function saveDraft(draft: Draft): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.DRAFTS, draft);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  const db = await getDB();
  return db.get(STORE_NAMES.DRAFTS, id);
}

export async function getDraftsByUser(userId: string | null): Promise<Draft[]> {
  const db = await getDB();
  const key = userId ?? "__guest__";
  return db.getAllFromIndex(STORE_NAMES.DRAFTS, "by-user", key);
}

export async function getPostDraftsByUser(userId: string | null): Promise<Draft[]> {
  const allDrafts = await getDraftsByUser(userId);
  return allDrafts.filter((d) => d.type === "post");
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.DRAFTS, id);
}

export async function deleteExpiredDrafts(): Promise<number> {
  const db = await getDB();
  const now = Date.now();
  const tx = db.transaction(STORE_NAMES.DRAFTS, "readwrite");
  const store = tx.objectStore(STORE_NAMES.DRAFTS);
  const index = store.index("by-expires");

  let deletedCount = 0;
  let cursor = await index.openCursor(IDBKeyRange.upperBound(now));

  while (cursor) {
    await cursor.delete();
    deletedCount++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return deletedCount;
}

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.SYNC_QUEUE, item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAMES.SYNC_QUEUE, "by-status", "pending");
}

export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.SYNC_QUEUE, item);
}

export async function deleteSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.SYNC_QUEUE, id);
}

export async function clearCompletedSyncItems(): Promise<number> {
  const db = await getDB();
  const items = await db.getAllFromIndex(
    STORE_NAMES.SYNC_QUEUE,
    "by-status",
    "completed"
  );
  const tx = db.transaction(STORE_NAMES.SYNC_QUEUE, "readwrite");
  await Promise.all(items.map((item) => tx.store.delete(item.id)));
  await tx.done;
  return items.length;
}

export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const item = await db.get(STORE_NAMES.METADATA, key);
  return item?.value as T | undefined;
}

export async function setMetadata<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.METADATA, {
    key,
    value,
    updatedAt: new Date(),
  });
}

export async function getStorageUsage(): Promise<StorageUsage> {
  if (!navigator.storage?.estimate) {
    return {
      usedBytes: 0,
      quotaBytes: OFFLINE_CONFIG.STORAGE_LIMIT,
      usageRatio: 0,
      isWarning: false,
      isLimitReached: false,
    };
  }

  const estimate = await navigator.storage.estimate();
  const usedBytes = estimate.usage || 0;
  const quotaBytes = estimate.quota || OFFLINE_CONFIG.STORAGE_LIMIT;
  const usageRatio = quotaBytes > 0 ? usedBytes / quotaBytes : 0;

  return {
    usedBytes,
    quotaBytes,
    usageRatio,
    isWarning: usedBytes >= OFFLINE_CONFIG.STORAGE_WARNING_THRESHOLD,
    isLimitReached: usedBytes >= OFFLINE_CONFIG.STORAGE_LIMIT,
  };
}

export async function getDraftCount(userId: string | null): Promise<number> {
  const drafts = await getDraftsByUser(userId);
  return drafts.length;
}

export async function getPendingSyncCount(): Promise<number> {
  const items = await getPendingSyncItems();
  return items.length;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false;
  }

  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) return true;

  return navigator.storage.persist();
}

export async function cleanupOldData(): Promise<{
  deletedDrafts: number;
  deletedSyncItems: number;
}> {
  const deletedDrafts = await deleteExpiredDrafts();
  const deletedSyncItems = await clearCompletedSyncItems();

  return { deletedDrafts, deletedSyncItems };
}
