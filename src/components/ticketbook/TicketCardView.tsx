"use client";

import { useMemo } from "react";
import { Ticket } from "@/types/ticketbook";
import { RotateCcw } from "lucide-react";
import { ViewMode } from "./TicketViewToggle";
import { needsRotation, getImageOrientation } from "./useTicketView";

interface TicketCardViewProps {
  ticket: Ticket;
  viewMode: ViewMode;
  onClick?: () => void;
}

/**
 * 통합 티켓 카드 뷰
 *
 * 뷰 모드에 따라 카드 비율과 이미지 회전을 처리
 * - 세로뷰 (portrait): 2:3 카드, 이미지의 긴 쪽이 세로
 * - 가로뷰 (landscape): 3:2 카드, 이미지의 긴 쪽이 가로
 * - 자동 (auto): 이미지 원본 비율에 맞는 카드
 */
export function TicketCardView({
  ticket,
  viewMode,
  onClick,
}: TicketCardViewProps) {
  const hasBackImage = !!ticket.backImage;
  const { width: imgWidth, height: imgHeight, url } = ticket.frontImage;

  // 이미지가 있는지 확인
  const hasValidImage = url.startsWith("data:") || url.startsWith("http");

  // 이미지 원본 방향
  const imageOrientation = useMemo(
    () => getImageOrientation(imgWidth, imgHeight),
    [imgWidth, imgHeight]
  );

  // 실제 적용할 뷰 모드 (auto일 때는 이미지 방향에 맞춤)
  const effectiveViewMode = useMemo(() => {
    if (viewMode === "auto") {
      return imageOrientation === "landscape" ? "landscape" : "portrait";
    }
    return viewMode;
  }, [viewMode, imageOrientation]);

  // 회전 필요 여부
  const shouldRotate = useMemo(
    () => needsRotation(imgWidth, imgHeight, effectiveViewMode),
    [imgWidth, imgHeight, effectiveViewMode]
  );

  // 카드 비율 클래스
  const aspectClass = effectiveViewMode === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]";

  // 회전 스타일 계산
  // 회전 후 이미지가 카드 너비에 맞도록 스케일 조정
  const rotationStyle = useMemo(() => {
    if (!shouldRotate) return undefined;

    // 회전 후 이미지 크기 (가로↔세로 반전)
    // 원본 800x362 가로 → 회전 후 362x800 세로
    // 카드는 aspect-[2/3] 비율
    // 이미지 너비(362)가 카드 너비에 맞도록 스케일 필요

    // 회전 후: 원래 height가 새 width, 원래 width가 새 height
    const rotatedWidth = imgHeight;  // 362
    const rotatedHeight = imgWidth;  // 800

    // 카드 너비 대비 회전된 이미지 너비 비율로 스케일 계산
    // 카드 너비를 imgWidth(원본 가로)로 가정하면
    // scale = imgWidth / rotatedWidth = 800 / 362 ≈ 2.2
    const scale = imgWidth / rotatedWidth;

    return {
      transform: `rotate(90deg) scale(${scale})`,
      transformOrigin: "center center",
    };
  }, [shouldRotate, imgWidth, imgHeight]);

  return (
    <div className="group relative w-full cursor-pointer" onClick={onClick}>
      {/* 카드 */}
      <div
        className={`relative w-full ${aspectClass} rounded-lg overflow-hidden shadow-lg bg-white transition-transform hover:scale-[1.02]`}
      >
        {hasValidImage ? (
          <div className="w-full h-full flex items-center justify-center bg-white overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={ticket.eventTitle}
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              style={rotationStyle}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🎫</div>
              <div className="font-bold text-sm line-clamp-2">
                {ticket.eventTitle}
              </div>
              <div className="text-xs mt-1 opacity-80">
                {ticket.eventDate.toLocaleDateString("ko-KR")}
              </div>
            </div>
          </div>
        )}

        {/* 날짜 배지 */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {ticket.eventDate.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
          })}
        </div>

        {/* 뒷면 있음 표시 */}
        {hasBackImage && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
          </div>
        )}

        {/* 이미지 크기 + 회전 표시 (디버깅용) */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
          {imgWidth}x{imgHeight} {imageOrientation === "landscape" ? "가로" : "세로"}
          {shouldRotate && " → 90°"}
        </div>

        {/* 호버 시 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
    </div>
  );
}

/**
 * 티켓 방향 유틸리티 함수 (하위 호환)
 */
export function getTicketOrientation(ticket: Ticket): "portrait" | "landscape" | "square" {
  return getImageOrientation(ticket.frontImage.width, ticket.frontImage.height);
}
