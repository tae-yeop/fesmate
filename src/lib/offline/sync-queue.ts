import {
  SyncQueueItem,
  SyncActionType,
  SyncStatus,
  OFFLINE_CONFIG,
} from "./types";
import {
  addToSyncQueue,
  getPendingSyncItems,
  updateSyncItem,
  deleteSyncItem,
} from "./indexed-db";

function generateId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface AddToQueueParams {
  action: SyncActionType;
  payload: Record<string, unknown>;
  userId: string | null;
}

export async function enqueue(params: AddToQueueParams): Promise<SyncQueueItem> {
  const item: SyncQueueItem = {
    id: generateId(),
    action: params.action,
    payload: params.payload,
    status: "pending",
    createdAt: new Date(),
    retryCount: 0,
    maxRetries: OFFLINE_CONFIG.MAX_SYNC_RETRIES,
    userId: params.userId,
  };

  await addToSyncQueue(item);
  return item;
}

export async function dequeue(id: string): Promise<void> {
  await deleteSyncItem(id);
}

export async function getQueue(): Promise<SyncQueueItem[]> {
  return getPendingSyncItems();
}

export async function markAsSyncing(id: string): Promise<void> {
  const items = await getPendingSyncItems();
  const item = items.find((i) => i.id === id);
  if (!item) return;

  await updateSyncItem({
    ...item,
    status: "syncing",
    lastAttemptAt: new Date(),
  });
}

export async function markAsCompleted(id: string): Promise<void> {
  const items = await getQueue();
  const item = items.find((i) => i.id === id);
  if (!item) return;

  await updateSyncItem({
    ...item,
    status: "completed",
  });
}

export async function markAsFailed(id: string, error: string): Promise<void> {
  const items = await getQueue();
  const item = items.find((i) => i.id === id);
  if (!item) return;

  const newRetryCount = item.retryCount + 1;
  const shouldGiveUp = newRetryCount >= item.maxRetries;

  await updateSyncItem({
    ...item,
    status: shouldGiveUp ? "failed" : "pending",
    retryCount: newRetryCount,
    error,
  });
}

function calculateBackoff(retryCount: number): number {
  const baseDelay = OFFLINE_CONFIG.SYNC_RETRY_BASE_MS;
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, 30000);
}

export type SyncHandler = (
  action: SyncActionType,
  payload: Record<string, unknown>
) => Promise<void>;

let syncInProgress = false;

export async function processQueue(handler: SyncHandler): Promise<{
  processed: number;
  failed: number;
}> {
  if (syncInProgress) {
    return { processed: 0, failed: 0 };
  }

  syncInProgress = true;
  let processed = 0;
  let failed = 0;

  try {
    const items = await getQueue();

    for (const item of items) {
      if (item.status === "syncing") continue;

      if (item.retryCount > 0) {
        const backoff = calculateBackoff(item.retryCount - 1);
        const lastAttempt = item.lastAttemptAt?.getTime() || 0;
        if (Date.now() - lastAttempt < backoff) {
          continue;
        }
      }

      await markAsSyncing(item.id);

      try {
        await handler(item.action, item.payload);
        await markAsCompleted(item.id);
        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await markAsFailed(item.id, errorMessage);
        failed++;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { processed, failed };
}

export function isSyncInProgress(): boolean {
  return syncInProgress;
}

export async function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}> {
  const items = await getQueue();
  
  return {
    pending: items.filter((i) => i.status === "pending").length,
    syncing: items.filter((i) => i.status === "syncing").length,
    failed: items.filter((i) => i.status === "failed").length,
    total: items.length,
  };
}

export async function retryAllFailed(): Promise<number> {
  const items = await getQueue();
  const failedItems = items.filter((i) => i.status === "failed");

  for (const item of failedItems) {
    await updateSyncItem({
      ...item,
      status: "pending",
      retryCount: 0,
      error: undefined,
    });
  }

  return failedItems.length;
}

export async function clearQueue(): Promise<number> {
  const items = await getQueue();
  for (const item of items) {
    await deleteSyncItem(item.id);
  }
  return items.length;
}
