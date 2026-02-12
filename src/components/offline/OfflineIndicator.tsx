"use client";

import { useOffline, useIsOnline, usePendingSyncCount } from "@/lib/offline-context";
import { Wifi, WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const isOnline = useIsOnline();
  const pendingSyncCount = usePendingSyncCount();
  const { syncNow } = useOffline();

  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all",
        isOnline
          ? "bg-amber-500 text-white"
          : "bg-gray-800 text-white"
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>동기화 대기 중 ({pendingSyncCount})</span>
          <button
            onClick={() => syncNow()}
            className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs hover:bg-white/30 transition-colors"
          >
            지금 동기화
          </button>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>오프라인 모드</span>
          {pendingSyncCount > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
              {pendingSyncCount}개 대기
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <div className="bg-gray-800 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
      <CloudOff className="h-4 w-4" />
      <span>인터넷 연결이 끊겼습니다. 작성 중인 내용은 자동으로 저장됩니다.</span>
    </div>
  );
}

export function NetworkStatusDot() {
  const isOnline = useIsOnline();

  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full",
        isOnline ? "bg-green-500" : "bg-red-500"
      )}
      title={isOnline ? "온라인" : "오프라인"}
    />
  );
}
