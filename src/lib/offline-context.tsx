"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import {
  OfflineState,
  PostDraft,
  CommentDraft,
  StorageUsage,
  SyncActionType,
} from "./offline/types";
import {
  getPostDrafts,
  getCommentDrafts,
  createPostDraft,
  updatePostDraft,
  createCommentDraft,
  updateCommentDraft,
  removeDraft,
  CreatePostDraftParams,
  CreateCommentDraftParams,
} from "./offline/draft-store";
import {
  enqueue,
  processQueue,
  getQueueStats,
  SyncHandler,
} from "./offline/sync-queue";
import {
  getDraftCount,
  getPendingSyncCount,
  getStorageUsage,
  cleanupOldData,
  requestPersistentStorage,
  getMetadata,
  setMetadata,
} from "./offline/indexed-db";

interface OfflineContextValue {
  state: OfflineState;
  postDrafts: PostDraft[];
  commentDrafts: CommentDraft[];
  
  savePostDraft: (params: Omit<CreatePostDraftParams, "userId">) => Promise<PostDraft>;
  updateDraft: (id: string, updates: Partial<PostDraft>) => Promise<PostDraft | null>;
  saveCommentDraft: (params: Omit<CreateCommentDraftParams, "userId">) => Promise<CommentDraft>;
  deleteDraft: (id: string) => Promise<void>;
  
  queueAction: (action: SyncActionType, payload: Record<string, unknown>) => Promise<void>;
  syncNow: () => Promise<void>;
  
  refreshDrafts: () => Promise<void>;
  cleanupStorage: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

const LAST_SYNC_KEY = "lastSyncAt";
const CLEANUP_INTERVAL = 1000 * 60 * 60;
const SYNC_INTERVAL = 1000 * 30;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    draftCount: 0,
    pendingSyncCount: 0,
    lastSyncAt: undefined,
    storageUsage: undefined,
  });

  const [postDrafts, setPostDrafts] = useState<PostDraft[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<CommentDraft[]>([]);

  const refreshState = useCallback(async () => {
    try {
      const [draftCount, pendingSyncCount, storageUsage, lastSyncAt] = await Promise.all([
        getDraftCount(userId),
        getPendingSyncCount(),
        getStorageUsage(),
        getMetadata<string>(LAST_SYNC_KEY),
      ]);

      setState((prev) => ({
        ...prev,
        draftCount,
        pendingSyncCount,
        storageUsage,
        lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : undefined,
      }));
    } catch (error) {
      console.error("[Offline] Failed to refresh state:", error);
    }
  }, [userId]);

  const refreshDrafts = useCallback(async () => {
    try {
      const [posts, comments] = await Promise.all([
        getPostDrafts(userId),
        getCommentDrafts(userId),
      ]);
      setPostDrafts(posts);
      setCommentDrafts(comments);
    } catch (error) {
      console.error("[Offline] Failed to refresh drafts:", error);
    }
  }, [userId]);

  const savePostDraft = useCallback(
    async (params: Omit<CreatePostDraftParams, "userId">): Promise<PostDraft> => {
      const draft = await createPostDraft({ ...params, userId });
      await refreshDrafts();
      await refreshState();
      return draft;
    },
    [userId, refreshDrafts, refreshState]
  );

  const updateDraft = useCallback(
    async (id: string, updates: Partial<PostDraft>): Promise<PostDraft | null> => {
      const updated = await updatePostDraft(id, updates);
      if (updated) {
        await refreshDrafts();
        await refreshState();
      }
      return updated;
    },
    [refreshDrafts, refreshState]
  );

  const saveCommentDraft = useCallback(
    async (params: Omit<CreateCommentDraftParams, "userId">): Promise<CommentDraft> => {
      const draft = await createCommentDraft({ ...params, userId });
      await refreshDrafts();
      await refreshState();
      return draft;
    },
    [userId, refreshDrafts, refreshState]
  );

  const deleteDraft = useCallback(
    async (id: string): Promise<void> => {
      await removeDraft(id);
      await refreshDrafts();
      await refreshState();
    },
    [refreshDrafts, refreshState]
  );

  const queueAction = useCallback(
    async (action: SyncActionType, payload: Record<string, unknown>): Promise<void> => {
      await enqueue({ action, payload, userId });
      await refreshState();
    },
    [userId, refreshState]
  );

  const defaultSyncHandler: SyncHandler = useCallback(
    async (action: SyncActionType, payload: Record<string, unknown>) => {
      console.log("[Offline] Sync action:", action, payload);
    },
    []
  );

  const syncNow = useCallback(async (): Promise<void> => {
    if (!state.isOnline) return;

    try {
      const result = await processQueue(defaultSyncHandler);
      await setMetadata(LAST_SYNC_KEY, new Date().toISOString());
      await refreshState();
      
      if (result.processed > 0) {
        console.log(`[Offline] Synced ${result.processed} items`);
      }
    } catch (error) {
      console.error("[Offline] Sync failed:", error);
    }
  }, [state.isOnline, defaultSyncHandler, refreshState]);

  const cleanupStorage = useCallback(async (): Promise<void> => {
    try {
      const result = await cleanupOldData();
      console.log(
        `[Offline] Cleanup: ${result.deletedDrafts} drafts, ${result.deletedSyncItems} sync items`
      );
      await refreshState();
      await refreshDrafts();
    } catch (error) {
      console.error("[Offline] Cleanup failed:", error);
    }
  }, [refreshState, refreshDrafts]);

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      syncNow();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  useEffect(() => {
    requestPersistentStorage().then((persisted) => {
      if (persisted) {
        console.log("[Offline] Storage will persist");
      }
    });

    refreshState();
    refreshDrafts();

    const cleanupInterval = setInterval(cleanupStorage, CLEANUP_INTERVAL);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [refreshState, refreshDrafts, cleanupStorage]);

  useEffect(() => {
    if (!state.isOnline) return;

    const syncInterval = setInterval(syncNow, SYNC_INTERVAL);

    return () => {
      clearInterval(syncInterval);
    };
  }, [state.isOnline, syncNow]);

  useEffect(() => {
    refreshState();
    refreshDrafts();
  }, [userId, refreshState, refreshDrafts]);

  const value: OfflineContextValue = {
    state,
    postDrafts,
    commentDrafts,
    savePostDraft,
    updateDraft,
    saveCommentDraft,
    deleteDraft,
    queueAction,
    syncNow,
    refreshDrafts,
    cleanupStorage,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}

export function useIsOnline(): boolean {
  const { state } = useOffline();
  return state.isOnline;
}

export function useDraftCount(): number {
  const { state } = useOffline();
  return state.draftCount;
}

export function usePendingSyncCount(): number {
  const { state } = useOffline();
  return state.pendingSyncCount;
}

export function useStorageUsage(): StorageUsage | undefined {
  const { state } = useOffline();
  return state.storageUsage;
}
