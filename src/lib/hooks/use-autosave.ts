"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OFFLINE_CONFIG } from "../offline/types";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutosaveReturn {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
  error: Error | null;
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = OFFLINE_CONFIG.AUTOSAVE_DEBOUNCE_MS,
  enabled = true,
}: UseAutosaveOptions<T>): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setStatus("saving");
    setError(null);

    try {
      await onSave(lastDataRef.current);
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err : new Error("Save failed"));
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await save();
  }, [save]);

  useEffect(() => {
    if (!enabled) return;

    const hasChanged = JSON.stringify(data) !== JSON.stringify(lastDataRef.current);
    lastDataRef.current = data;

    if (!hasChanged) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, enabled, save]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveNow();
      }
    };

    const handleBeforeUnload = () => {
      saveNow();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, saveNow]);

  return {
    status,
    lastSavedAt,
    saveNow,
    error,
  };
}

export function useAutosaveIndicator(status: AutosaveStatus): {
  text: string;
  className: string;
} {
  switch (status) {
    case "saving":
      return {
        text: "저장 중...",
        className: "text-muted-foreground",
      };
    case "saved":
      return {
        text: "저장됨",
        className: "text-green-600",
      };
    case "error":
      return {
        text: "저장 실패",
        className: "text-red-600",
      };
    default:
      return {
        text: "",
        className: "",
      };
  }
}
