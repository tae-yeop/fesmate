"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import type { TicketTemplate, CompositeResult } from "@/lib/templates";
import { compositeTicketWithTemplate } from "@/lib/templates";

interface TicketEditorResultProps {
  /** 워프된 티켓 캔버스 */
  warpedCanvas: HTMLCanvasElement | null;
  /** 선택된 템플릿 */
  template: TicketTemplate;
  /** 결과 변경 콜백 */
  onResultChange?: (result: CompositeResult | null) => void;
  /** 다시 편집 콜백 */
  onReEdit?: () => void;
  /** 컨테이너 클래스 */
  className?: string;
}

/**
 * 템플릿 합성 결과 표시
 */
export function TicketEditorResult({
  warpedCanvas,
  template,
  onResultChange,
  onReEdit,
  className = "",
}: TicketEditorResultProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<CompositeResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!warpedCanvas) {
      setResult(null);
      onResultChange?.(null);
      return;
    }

    setIsProcessing(true);

    try {
      const compositeResult = compositeTicketWithTemplate(warpedCanvas, template, {
        outputWidth: 800,
        quality: 0.92,
      });

      setResult(compositeResult);
      onResultChange?.(compositeResult);

      // 캔버스에 그리기
      if (canvasRef.current) {
        canvasRef.current.width = compositeResult.width;
        canvasRef.current.height = compositeResult.height;
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.drawImage(compositeResult.canvas, 0, 0);
        }
      }
    } catch (err) {
      console.error("Composite error:", err);
      setResult(null);
      onResultChange?.(null);
    } finally {
      setIsProcessing(false);
    }
  }, [warpedCanvas, template, onResultChange]);

  const handleDownload = () => {
    if (!result) return;

    const link = document.createElement("a");
    link.download = `ticket-${Date.now()}.png`;
    link.href = result.dataUrl;
    link.click();
  };

  if (!warpedCanvas) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ minHeight: 200 }}
      >
        <p className="text-gray-500 text-sm">먼저 티켓 영역을 지정하세요</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 결과 미리보기 */}
      <div className="relative flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[300px]">
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg z-10">
            <div className="bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">합성 중...</span>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[400px] object-contain shadow-xl rounded"
          style={{ display: result ? "block" : "none" }}
        />

        {!result && !isProcessing && (
          <p className="text-gray-500 text-sm">결과를 생성하는 중...</p>
        )}
      </div>

      {/* 액션 버튼 - onReEdit가 있을 때만 표시 */}
      {result && onReEdit && (
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              console.log("다시 편집 클릭");
              onReEdit();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            다시 편집
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            다운로드
          </button>
        </div>
      )}
    </div>
  );
}
