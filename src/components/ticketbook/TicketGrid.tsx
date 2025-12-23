"use client";

import { Ticket } from "@/types/ticketbook";
import { TicketCardView } from "./TicketCardView";
import { TicketViewToggle, ViewMode } from "./TicketViewToggle";
import { useTicketView } from "./useTicketView";
import { Plus } from "lucide-react";

interface TicketGridProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
  onAddClick?: () => void;
  /** 외부에서 뷰 모드를 제어할 경우 */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

/**
 * 티켓 그리드 - 티켓 목록을 선택한 뷰 모드로 표시
 * - 세로뷰: 2:3 카드, 모든 이미지의 긴 쪽이 세로로
 * - 가로뷰: 3:2 카드, 모든 이미지의 긴 쪽이 가로로
 */
export function TicketGrid({
  tickets,
  onTicketClick,
  onAddClick,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
}: TicketGridProps) {
  // 내부 뷰 모드 상태 (외부 제어가 없을 때 사용)
  const { viewMode: internalViewMode, setViewMode: internalSetViewMode, isLoaded } = useTicketView("landscape");

  // 외부 또는 내부 상태 사용
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = externalOnViewModeChange ?? internalSetViewMode;

  // 그리드 컬럼 수 (뷰 모드에 따라 조정)
  const gridCols = viewMode === "landscape"
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  // 추가 버튼 비율
  const addButtonAspect = viewMode === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]";

  if (tickets.length === 0 && !onAddClick) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="text-6xl mb-4">🎫</div>
        <p className="text-lg font-medium">아직 티켓이 없어요</p>
        <p className="text-sm mt-1">다녀온 공연의 티켓을 등록해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 뷰 선택 토글 */}
      {tickets.length > 0 && (
        <div className="flex justify-end">
          <TicketViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      )}

      {/* 티켓 그리드 */}
      <div className={`grid ${gridCols} gap-4`}>
        {/* 추가 버튼 */}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className={`${addButtonAspect} rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-purple-500`}
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">티켓 추가</span>
          </button>
        )}

        {/* 티켓 카드들 */}
        {tickets.map((ticket) => (
          <TicketCardView
            key={ticket.id}
            ticket={ticket}
            viewMode={viewMode}
            onClick={() => onTicketClick?.(ticket)}
          />
        ))}
      </div>
    </div>
  );
}
