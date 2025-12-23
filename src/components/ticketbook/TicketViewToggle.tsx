"use client";

import { Smartphone, Monitor } from "lucide-react";

export type ViewMode = "portrait" | "landscape" | "auto";

interface TicketViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showAutoOption?: boolean;
}

/**
 * 뷰 선택 토글 버튼
 * - 세로뷰 (📱): 2:3 카드, 이미지의 긴 쪽이 세로
 * - 가로뷰 (📺): 3:2 카드, 이미지의 긴 쪽이 가로
 *
 * 아이콘은 "카드 모양"을 나타냄:
 * - 세로뷰 = 세로로 긴 카드 (📱)
 * - 가로뷰 = 가로로 긴 카드 (📺)
 */
export function TicketViewToggle({
  viewMode,
  onViewModeChange,
  showAutoOption = false,
}: TicketViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {/* 가로뷰 버튼 - 가로로 긴 카드 */}
      <button
        onClick={() => onViewModeChange("landscape")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "landscape"
            ? "bg-white text-purple-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <Monitor className="h-4 w-4" />
        <span>가로</span>
      </button>

      {/* 세로뷰 버튼 - 세로로 긴 카드 */}
      <button
        onClick={() => onViewModeChange("portrait")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "portrait"
            ? "bg-white text-purple-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <Smartphone className="h-4 w-4" />
        <span>세로</span>
      </button>

      {/* 자동 옵션 (선택적) */}
      {showAutoOption && (
        <button
          onClick={() => onViewModeChange("auto")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === "auto"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span>자동</span>
        </button>
      )}
    </div>
  );
}
