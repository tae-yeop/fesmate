"use client";

import { Ticket } from "@/types/ticketbook";
import { RotateCcw } from "lucide-react";

interface LandscapeTicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

/**
 * 가로 방향 티켓 전용 카드
 * - 가로로 긴 티켓을 자연스럽게 가로 방향으로 표시
 * - 세로 카드에 억지로 맞추지 않고 원본 비율 유지
 */
export function LandscapeTicketCard({
  ticket,
  onClick,
}: LandscapeTicketCardProps) {
  const hasBackImage = !!ticket.backImage;

  // 이미지가 있는지 확인
  const hasValidImage =
    ticket.frontImage.url.startsWith("data:") ||
    ticket.frontImage.url.startsWith("http");

  return (
    <div
      className="group relative w-full cursor-pointer"
      onClick={onClick}
    >
      {/* 카드 - 가로 비율 (3:2) */}
      <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden shadow-lg bg-white transition-transform hover:scale-[1.02]">
        {hasValidImage ? (
          <div className="w-full h-full flex items-center justify-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ticket.frontImage.url}
              alt={ticket.eventTitle}
              className="w-full h-full object-contain"
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
