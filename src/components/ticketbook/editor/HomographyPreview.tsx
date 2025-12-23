"use client";

import { useEffect, useRef, useState } from "react";
import type { QuadPoints, PreviewScale } from "@/lib/homography";
import { loadImage, warpImage } from "@/lib/homography";

interface HomographyPreviewProps {
  /** 원본 이미지 URL */
  imageUrl: string;
  /** 4점 꼭지점 좌표 (미리보기 기준) */
  corners: QuadPoints;
  /** 미리보기 스케일 정보 */
  previewScale: PreviewScale;
  /** 변환 완료 콜백 */
  onWarpComplete?: (canvas: HTMLCanvasElement) => void;
  /** 컨테이너 클래스 */
  className?: string;
}

/**
 * 호모그래피 변환 결과 미리보기
 */
export function HomographyPreview({
  imageUrl,
  corners,
  previewScale,
  onWarpComplete,
  className = "",
}: HomographyPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function processWarp() {
      if (!canvasRef.current) return;

      setIsProcessing(true);
      setError(null);

      try {
        const img = await loadImage(imageUrl);
        if (cancelled) return;

        const result = await warpImage(
          img,
          corners,
          previewScale,
          canvasRef.current
        );

        if (cancelled) return;

        setDimensions({ width: result.width, height: result.height });
        onWarpComplete?.(canvasRef.current);
      } catch (err) {
        if (!cancelled) {
          setError("변환 중 오류가 발생했습니다.");
          console.error("Warp error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    }

    // 디바운스: 드래그 중 너무 자주 호출되지 않도록
    const timeoutId = setTimeout(processWarp, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [imageUrl, corners, previewScale, onWarpComplete]);

  return (
    <div className={`relative flex items-center justify-center bg-gray-100 ${className}`}>
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">변환 중...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain shadow-lg"
        style={{
          maxHeight: "100%",
          display: dimensions ? "block" : "none",
        }}
      />

      {dimensions && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {dimensions.width} × {dimensions.height}
        </div>
      )}
    </div>
  );
}
