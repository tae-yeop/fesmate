"use client";

import { useCallback } from "react";
import type { Point } from "@/lib/homography";

interface CornerHandleProps {
  /** 꼭지점 좌표 */
  position: Point;
  /** 꼭지점 인덱스 (0: TL, 1: TR, 2: BR, 3: BL) */
  index: number;
  /** 활성화 여부 */
  isActive: boolean;
  /** 드래그 시작 콜백 */
  onDragStart: (index: number) => void;
  /** 핸들 크기 (기본: 24) */
  size?: number;
}

const CORNER_LABELS = ["TL", "TR", "BR", "BL"];

/**
 * 드래그 가능한 꼭지점 핸들
 */
export function CornerHandle({
  position,
  index,
  isActive,
  onDragStart,
  size = 24,
}: CornerHandleProps) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStart(index);
    },
    [index, onDragStart]
  );

  const halfSize = size / 2;

  return (
    <div
      className={`absolute cursor-grab active:cursor-grabbing touch-none select-none
        flex items-center justify-center
        rounded-full border-2 transition-all duration-150
        ${
          isActive
            ? "bg-primary border-white shadow-lg scale-110 z-20"
            : "bg-white/90 border-primary shadow-md z-10 hover:scale-105"
        }`}
      style={{
        width: size,
        height: size,
        left: position[0] - halfSize,
        top: position[1] - halfSize,
      }}
      onPointerDown={handlePointerDown}
    >
      <span
        className={`text-[10px] font-bold ${
          isActive ? "text-white" : "text-primary"
        }`}
      >
        {CORNER_LABELS[index]}
      </span>
    </div>
  );
}
