"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Ticket } from "@/types/ticketbook";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  Trash2,
  Edit2,
  RotateCcw,
  Calendar,
  MapPin,
  Users,
  MessageSquare,
  Smartphone,
  Monitor,
} from "lucide-react";
import { ViewMode } from "./TicketViewToggle";
import { needsRotation, getImageOrientation } from "./useTicketView";

interface TicketViewerProps {
  tickets: Ticket[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (ticketId: string) => void;
  onEdit?: (ticket: Ticket) => void;
  onShare?: (ticket: Ticket) => void;
}

/**
 * 티켓 뷰어 - 전체화면에서 티켓을 넘기며 볼 수 있는 컴포넌트
 */
export function TicketViewer({
  tickets,
  initialIndex = 0,
  isOpen,
  onClose,
  onDelete,
  onEdit,
  onShare,
}: TicketViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("landscape");

  // initialIndex가 변경되면 currentIndex 업데이트
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsFlipped(false);
  }, [initialIndex]);

  // localStorage에서 뷰 모드 로드
  useEffect(() => {
    const saved = localStorage.getItem("fesmate_ticketbook_view");
    if (saved && ["portrait", "landscape"].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ":
          e.preventDefault();
          toggleFlip();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, tickets.length]);

  const currentTicket = tickets[currentIndex];

  // 뷰 모드 토글
  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === "portrait" ? "landscape" : "portrait";
    setViewMode(newMode);
    localStorage.setItem("fesmate_ticketbook_view", newMode);
  }, [viewMode]);

  // 현재 뷰가 가로 모드인지
  const isLandscapeView = viewMode === "landscape";

  // 회전 필요 여부
  const shouldRotate = useMemo(() => {
    if (!currentTicket) return false;
    const { width, height } = currentTicket.frontImage;
    return needsRotation(width, height, viewMode);
  }, [currentTicket, viewMode]);

  // 회전 스타일
  const rotationStyle = useMemo(() => {
    if (!shouldRotate || !currentTicket) return undefined;

    const { width: imgWidth, height: imgHeight } = currentTicket.frontImage;
    const cardRatio = isLandscapeView ? 3 / 2 : 2 / 3;
    const imgRatio = imgWidth / imgHeight;
    const rotatedImgRatio = 1 / imgRatio;

    let scale: number;
    if (isLandscapeView) {
      scale = cardRatio * rotatedImgRatio;
    } else {
      scale = rotatedImgRatio / cardRatio;
    }
    scale = Math.min(Math.max(scale, 0.6), 1.5);

    return {
      transform: `rotate(90deg) scale(${scale})`,
      transformOrigin: "center center",
    };
  }, [shouldRotate, currentTicket, isLandscapeView]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
      }, 100);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < tickets.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 100);
    }
  }, [currentIndex, tickets.length]);

  const toggleFlip = useCallback(() => {
    if (currentTicket?.backImage) {
      setIsFlipped((prev) => !prev);
    }
  }, [currentTicket]);

  // 스와이프 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setTouchStart(null);
  };

  if (!isOpen || !currentTicket) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-1">
          {/* 뷰 모드 토글 버튼 */}
          <button
            onClick={toggleViewMode}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"
            title={isLandscapeView ? "세로뷰로 전환" : "가로뷰로 전환"}
          >
            {isLandscapeView ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </button>
          {onShare && (
            <button
              onClick={() => onShare(currentTicket)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Share2 className="h-5 w-5" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(currentTicket)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm("이 티켓을 삭제하시겠습니까?")) {
                  onDelete(currentTicket.id);
                  if (tickets.length === 1) {
                    onClose();
                  } else if (currentIndex >= tickets.length - 1) {
                    setCurrentIndex((prev) => prev - 1);
                  }
                }
              }}
              className="p-2 hover:bg-red-500/30 rounded-full transition-colors text-red-400"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        className="flex-1 flex items-center justify-center px-4 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 이전 버튼 */}
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className={`absolute left-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ${
            currentIndex === 0 ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </button>

        {/* 티켓 이미지 */}
        <div
          className={`w-full mx-auto cursor-pointer ${isLandscapeView ? "max-w-2xl" : "max-w-sm"}`}
          style={{ perspective: "1000px" }}
          onClick={toggleFlip}
        >
          <div
            className={`relative w-full transition-transform duration-500 ease-in-out ${
              isLandscapeView ? "aspect-[3/2]" : "aspect-[2/3]"
            }`}
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-2xl bg-gray-800"
              style={{ backfaceVisibility: "hidden" }}
            >
              {currentTicket.frontImage.url.startsWith("data:") ||
              currentTicket.frontImage.url.startsWith("http") ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentTicket.frontImage.url}
                    alt={currentTicket.eventTitle}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={rotationStyle}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                  <div className="text-center p-6">
                    <div className="text-6xl mb-4">🎫</div>
                    <div className="font-bold text-xl mb-2">
                      {currentTicket.eventTitle}
                    </div>
                    <div className="text-sm opacity-80">
                      {currentTicket.eventDate.toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    {currentTicket.seat && (
                      <div className="text-sm mt-2 opacity-80">
                        {currentTicket.seat}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Back */}
            {currentTicket.backImage && (
              <div
                className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-2xl bg-gray-800"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {currentTicket.backImage.url.startsWith("data:") ||
                currentTicket.backImage.url.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentTicket.backImage.url}
                    alt={`${currentTicket.eventTitle} 뒷면`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white">
                    <div className="text-center p-6">
                      <div className="text-6xl mb-4">🎟️</div>
                      <div className="text-sm">뒷면</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 플립 힌트 */}
          {currentTicket.backImage && (
            <div className="mt-4 flex items-center justify-center gap-2 text-white/60 text-sm">
              <RotateCcw className="h-4 w-4" />
              <span>탭하여 {isFlipped ? "앞면" : "뒷면"} 보기</span>
            </div>
          )}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={goToNext}
          disabled={currentIndex === tickets.length - 1}
          className={`absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ${
            currentIndex === tickets.length - 1
              ? "opacity-30 cursor-not-allowed"
              : ""
          }`}
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </button>
      </div>

      {/* 페이지 인디케이터 */}
      <div className="py-2 text-center text-white/60 text-sm">
        {currentIndex + 1} / {tickets.length}
      </div>

      {/* 티켓 정보 */}
      <div className="bg-white/5 backdrop-blur-sm p-4 space-y-2">
        <h3 className="text-white font-bold text-lg line-clamp-1">
          {currentTicket.eventTitle}
        </h3>

        <div className="flex flex-wrap gap-3 text-white/70 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {currentTicket.eventDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </div>

          {currentTicket.seat && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{currentTicket.seat}</span>
            </div>
          )}

          {currentTicket.companion && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{currentTicket.companion}</span>
            </div>
          )}
        </div>

        {currentTicket.memo && (
          <div className="flex items-start gap-1 text-white/70 text-sm">
            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{currentTicket.memo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
