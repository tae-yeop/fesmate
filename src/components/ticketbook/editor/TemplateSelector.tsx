"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { TICKET_TEMPLATES, createTemplateThumbnail } from "@/lib/templates";
import type { TicketTemplate } from "@/lib/templates";

interface TemplateSelectorProps {
  /** 선택된 템플릿 ID */
  selectedId: string;
  /** 템플릿 선택 콜백 */
  onSelect: (template: TicketTemplate) => void;
  /** 컨테이너 클래스 */
  className?: string;
}

interface TemplateThumbnailProps {
  template: TicketTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function TemplateThumbnail({ template, isSelected, onClick }: TemplateThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const thumbnail = createTemplateThumbnail(template, 60);
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = thumbnail.width;
        canvasRef.current.height = thumbnail.height;
        ctx.drawImage(thumbnail, 0, 0);
      }
    }
  }, [template]);

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all
        ${
          isSelected
            ? "bg-primary/10 ring-2 ring-primary"
            : "bg-gray-50 hover:bg-gray-100"
        }`}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded shadow-sm"
          style={{ width: 60, height: 84 }}
        />
        {isSelected && (
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <span
        className={`text-xs truncate max-w-[70px] ${
          isSelected ? "text-primary font-medium" : "text-gray-600"
        }`}
      >
        {template.name}
      </span>
    </button>
  );
}

/**
 * 템플릿 선택 캐러셀/그리드
 */
export function TemplateSelector({
  selectedId,
  onSelect,
  className = "",
}: TemplateSelectorProps) {
  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-3">템플릿 선택</h4>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {TICKET_TEMPLATES.map((template) => (
          <TemplateThumbnail
            key={template.id}
            template={template}
            isSelected={selectedId === template.id}
            onClick={() => onSelect(template)}
          />
        ))}
      </div>
    </div>
  );
}
