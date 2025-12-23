"use client";

import { useCallback, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { CornerPointEditor } from "./editor/CornerPointEditor";
import { HomographyPreview } from "./editor/HomographyPreview";
import { TemplateSelector } from "./editor/TemplateSelector";
import { TicketEditorResult } from "./editor/TicketEditorResult";
import { TICKET_TEMPLATES, type TicketTemplate, type CompositeResult } from "@/lib/templates";
import type { QuadPoints, PreviewScale } from "@/lib/homography";
import { preloadHomography } from "@/lib/homography";

interface TicketEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 편집할 이미지 URL */
  imageUrl: string;
  /** 편집 완료 콜백 (결과 Data URL) */
  onComplete: (resultDataUrl: string) => void;
}

type EditorStep = "corners" | "preview" | "template" | "result";

const STEPS: { key: EditorStep; label: string }[] = [
  { key: "corners", label: "영역 지정" },
  { key: "preview", label: "변환 미리보기" },
  { key: "template", label: "템플릿 선택" },
  { key: "result", label: "완성" },
];

/**
 * 티켓 에디터 모달
 * 4점 태깅 → 호모그래피 변환 → 템플릿 합성 플로우
 */
export function TicketEditorModal({
  isOpen,
  onClose,
  imageUrl,
  onComplete,
}: TicketEditorModalProps) {
  const [step, setStep] = useState<EditorStep>("corners");
  const [corners, setCorners] = useState<QuadPoints | null>(null);
  const [previewScale, setPreviewScale] = useState<PreviewScale | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate>(
    TICKET_TEMPLATES[0]
  );
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [finalResult, setFinalResult] = useState<CompositeResult | null>(null);

  // 호모그래피 라이브러리 프리로드
  useState(() => {
    preloadHomography();
  });

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const handleCornersChange = useCallback(
    (newCorners: QuadPoints, scale: PreviewScale) => {
      setCorners(newCorners);
      setPreviewScale(scale);
    },
    []
  );

  const handleWarpComplete = useCallback((canvas: HTMLCanvasElement) => {
    setWarpedCanvas(canvas);
  }, []);

  const handleTemplateSelect = useCallback((template: TicketTemplate) => {
    setSelectedTemplate(template);
  }, []);

  const handleResultChange = useCallback((result: CompositeResult | null) => {
    setFinalResult(result);
  }, []);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].key);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].key);
    }
  };

  const handleComplete = () => {
    if (finalResult) {
      onComplete(finalResult.dataUrl);
      onClose();
    }
  };

  const handleReEdit = () => {
    setStep("corners");
    setWarpedCanvas(null);
    setFinalResult(null);
  };

  const canGoNext = () => {
    switch (step) {
      case "corners":
        return corners !== null;
      case "preview":
        return warpedCanvas !== null;
      case "template":
        return selectedTemplate !== null;
      case "result":
        return finalResult !== null;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <button
          onClick={currentStepIndex > 0 ? handlePrev : onClose}
          className="p-2 -ml-2 hover:bg-accent rounded-lg"
        >
          {currentStepIndex > 0 ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="font-bold">티켓 편집</h2>
        </div>

        <div className="text-sm text-muted-foreground">
          {currentStepIndex + 1}/{STEPS.length}
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex justify-center gap-1 py-3 bg-gray-50">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`h-1.5 rounded-full transition-all ${
              i <= currentStepIndex
                ? "w-8 bg-primary"
                : "w-4 bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-auto p-4 flex flex-col">
        {/* Step 1: 영역 지정 */}
        {step === "corners" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              티켓의 네 꼭지점을 드래그하여 영역을 지정하세요
            </p>
            <div className="w-full max-w-lg mx-auto flex justify-center overflow-visible">
              <CornerPointEditor
                key={imageUrl}
                imageUrl={imageUrl}
                onCornersChange={handleCornersChange}
                initialCorners={corners || undefined}
                maxPreviewDimension={400}
                className="rounded-lg shadow-lg"
              />
            </div>
            {/* Step 1 전용 버튼 (이미지 편집창 바로 아래) */}
            <div className="flex gap-2 w-full max-w-lg mx-auto mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex-1 py-3 px-4 rounded-full bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 변환 미리보기 */}
        {step === "preview" && corners && previewScale && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              호모그래피 변환 결과를 확인하세요
            </p>
            <div className="w-full max-w-lg mx-auto h-[400px]">
              <HomographyPreview
                imageUrl={imageUrl}
                corners={corners}
                previewScale={previewScale}
                onWarpComplete={handleWarpComplete}
                className="w-full h-full rounded-lg overflow-hidden"
              />
            </div>
            {/* Step 2 버튼 */}
            <div className="flex gap-2 w-full max-w-lg mx-auto mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex-1 py-3 px-4 rounded-full bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 템플릿 선택 */}
        {step === "template" && warpedCanvas && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
            <p className="text-sm text-muted-foreground text-center">
              티켓에 적용할 템플릿을 선택하세요
            </p>

            {/* 템플릿 미리보기 */}
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
              <TicketEditorResult
                warpedCanvas={warpedCanvas}
                template={selectedTemplate}
                className="w-full"
              />
            </div>

            {/* 템플릿 선택 */}
            <TemplateSelector
              selectedId={selectedTemplate.id}
              onSelect={handleTemplateSelect}
            />

            {/* Step 3 버튼 */}
            <div className="flex gap-2 w-full mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex-1 py-3 px-4 rounded-full bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: 결과 */}
        {step === "result" && warpedCanvas && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
            <p className="text-sm text-muted-foreground text-center">
              완성된 티켓입니다
            </p>
            <TicketEditorResult
              warpedCanvas={warpedCanvas}
              template={selectedTemplate}
              onResultChange={handleResultChange}
              onReEdit={handleReEdit}
            />
            {/* Step 4 버튼 */}
            <div className="flex gap-2 w-full mt-4">
              <button
                onClick={handleComplete}
                disabled={!finalResult}
                className="flex-1 py-3 px-4 rounded-full bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
