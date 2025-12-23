"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CornerHandle } from "./CornerHandle";
import type { Point, QuadPoints, PreviewScale } from "@/lib/homography";
import {
  calculatePreviewScale,
  createDefaultCorners,
  clampPointToImage,
} from "@/lib/homography";

interface CornerPointEditorProps {
  /** 원본 이미지 URL */
  imageUrl: string;
  /** 꼭지점 변경 콜백 */
  onCornersChange: (corners: QuadPoints, previewScale: PreviewScale) => void;
  /** 초기 꼭지점 좌표 (없으면 기본값 생성) */
  initialCorners?: QuadPoints;
  /** 미리보기 최대 치수 */
  maxPreviewDimension?: number;
  /** 컨테이너 클래스 */
  className?: string;
}

/**
 * 4점 꼭지점 태깅 에디터
 * 사용자가 이미지 위에서 4개의 꼭지점을 드래그하여 조정
 */
export function CornerPointEditor({
  imageUrl,
  onCornersChange,
  initialCorners,
  maxPreviewDimension = 600,
  className = "",
}: CornerPointEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCornersChangeRef = useRef(onCornersChange);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewScale, setPreviewScale] = useState<PreviewScale | null>(null);
  const [corners, setCorners] = useState<QuadPoints | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const initializedRef = useRef(false);

  // 콜백 ref 업데이트
  useEffect(() => {
    onCornersChangeRef.current = onCornersChange;
  }, [onCornersChange]);

  // 이미지 로드 및 초기화 (한 번만 실행)
  useEffect(() => {
    if (initializedRef.current) return;

    const img = new Image();
    img.onload = () => {
      const scale = calculatePreviewScale(
        img.naturalWidth,
        img.naturalHeight,
        maxPreviewDimension
      );
      setPreviewScale(scale);
      setContainerSize({
        width: scale.previewWidth,
        height: scale.previewHeight,
      });

      // 초기 꼭지점 설정 (여백 15%)
      const defaultCorners =
        initialCorners ||
        createDefaultCorners(scale.previewWidth, scale.previewHeight, 0.15);
      setCorners(defaultCorners);
      setImageLoaded(true);
      initializedRef.current = true;

      // 부모에게 알림
      onCornersChangeRef.current(defaultCorners, scale);
    };
    img.src = imageUrl;
  }, [imageUrl, maxPreviewDimension, initialCorners]);

  // 드래그 시작
  const handleDragStart = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // 포인터 이동 핸들러
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (activeIndex === null || !corners || !containerRef.current || !containerSize || !previewScale)
        return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 경계 내로 제한
      const clampedPoint = clampPointToImage(
        [x, y],
        containerSize.width,
        containerSize.height,
        5
      );

      const newCorners = [...corners] as QuadPoints;
      newCorners[activeIndex] = clampedPoint;
      setCorners(newCorners);
      onCornersChangeRef.current(newCorners, previewScale);
    },
    [activeIndex, corners, containerSize, previewScale]
  );

  // 드래그 종료
  const handlePointerUp = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // 전역 이벤트 리스너
  useEffect(() => {
    if (activeIndex !== null) {
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerUp);

      return () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerUp);
      };
    }
  }, [activeIndex, handlePointerMove, handlePointerUp]);

  // 꼭지점 연결선 그리기용 SVG 경로
  const getQuadPath = (pts: QuadPoints): string => {
    return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]} L ${pts[2][0]} ${pts[2][1]} L ${pts[3][0]} ${pts[3][1]} Z`;
  };

  if (!imageLoaded || !previewScale || !corners || !containerSize) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ minHeight: 300 }}
      >
        <div className="text-gray-500">이미지 로딩 중...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative touch-none select-none ${className}`}
      style={{
        width: containerSize.width,
        height: containerSize.height,
        overflow: "visible",
      }}
    >
      {/* 배경 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="편집할 이미지"
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: containerSize.width,
          height: containerSize.height,
          objectFit: "fill",
        }}
        draggable={false}
      />

      {/* 어두운 오버레이 + 선택 영역 */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={containerSize.width}
        height={containerSize.height}
        style={{ overflow: "visible" }}
      >
        <defs>
          <mask id="quadMask">
            <rect width="100%" height="100%" fill="white" />
            <path d={getQuadPath(corners)} fill="black" />
          </mask>
        </defs>
        {/* 어두운 오버레이 (선택 영역 외) */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#quadMask)"
        />
        {/* 선택 영역 테두리 */}
        <path
          d={getQuadPath(corners)}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8 4"
        />
      </svg>

      {/* 꼭지점 핸들 - 4개 모두 렌더링 */}
      {corners.map((corner, index) => (
        <CornerHandle
          key={index}
          position={corner}
          index={index}
          isActive={activeIndex === index}
          onDragStart={handleDragStart}
          size={32}
        />
      ))}

      {/* 안내 텍스트 */}
      <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
        <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
          꼭지점을 드래그하여 티켓 영역을 지정하세요
        </span>
      </div>
    </div>
  );
}
