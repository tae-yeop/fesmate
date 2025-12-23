"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Ticket } from "@/types/ticketbook";
import { RotateCcw } from "lucide-react";

interface AdaptiveTicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

/**
 * 티켓 방향 감지
 */
function getTicketOrientation(ticket: Ticket): "portrait" | "landscape" | "square" {
  const { width, height } = ticket.frontImage;
  const ratio = width / height;

  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}


/**
 * 적응형 티켓 카드 - 티켓 비율에 따라 레이아웃 자동 조정
 * - Portrait/Square: 세로 카드 (기존 방식)
 * - Landscape: 90도 회전하여 세로 카드에 꽉 차게 표시
 */
export function AdaptiveTicketCard({
  ticket,
  onClick,
}: AdaptiveTicketCardProps) {
  const hasBackImage = !!ticket.backImage;
  const orientation = useMemo(() => getTicketOrientation(ticket), [ticket]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 이미지가 있는지 확인
  const hasValidImage =
    ticket.frontImage.url.startsWith("data:") ||
    ticket.frontImage.url.startsWith("http");

  // 가로 이미지는 90도 회전 필요
  const needsRotation = orientation === "landscape";

  // 컨테이너 크기 측정
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  // 가로 이미지 회전 시 스케일 계산
  // 회전 후 이미지가 카드를 꽉 채우도록 scale 계산
  const rotationStyle = useMemo(() => {
    if (!needsRotation) return undefined;

    // 이미지 원본 비율
    const imgRatio = ticket.frontImage.width / ticket.frontImage.height;

    // 카드 비율 2:3 (가로:세로)
    // 회전 후 이미지의 가로(원래 세로)가 카드 가로에,
    // 회전 후 이미지의 세로(원래 가로)가 카드 세로에 맞아야 함

    // 회전 후 이미지 비율 = 1/imgRatio (가로세로 반전)
    const rotatedImgRatio = 1 / imgRatio;
    const cardRatio = 2 / 3;

    // 스케일 계산: contain 방식으로 카드 안에 맞추기
    let scale: number;
    if (rotatedImgRatio > cardRatio) {
      // 회전된 이미지가 더 세로로 길면 → 가로 기준으로 맞춤
      scale = cardRatio / rotatedImgRatio;
    } else {
      // 회전된 이미지가 더 가로로 넓으면 → 세로 기준으로 맞춤
      scale = rotatedImgRatio / cardRatio;
    }

    // 최소 스케일 보장 (너무 작아지지 않도록)
    scale = Math.max(scale, 0.5);

    return {
      transform: `rotate(90deg) scale(${scale * 1.5})`,
      transformOrigin: "center center",
    };
  }, [needsRotation, ticket.frontImage.width, ticket.frontImage.height]);

  return (
    <div
      className="group relative w-full cursor-pointer"
      onClick={onClick}
    >
      {/* 카드 - 항상 세로 비율 유지 */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-white transition-transform hover:scale-[1.02]"
      >
        {hasValidImage ? (
          <div className="w-full h-full flex items-center justify-center bg-white overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ticket.frontImage.url}
              alt={ticket.eventTitle}
              className="max-w-full max-h-full object-contain"
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

        {/* 호버 시 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
    </div>
  );
}

/**
 * 티켓 방향 유틸리티 함수 export
 */
export { getTicketOrientation };
