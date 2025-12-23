/**
 * 플레이스홀더 템플릿 정의
 * 실제 PNG 파일 없이 Canvas로 렌더링하는 기본 템플릿
 */

import type { TicketTemplate } from "./types";

/** 사용 가능한 템플릿 목록 */
export const TICKET_TEMPLATES: TicketTemplate[] = [
  {
    id: "simple-white",
    name: "심플 화이트",
    category: "simple",
    description: "깔끔한 흰색 배경에 그림자 효과",
    ticketArea: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
    backgroundColor: "#ffffff",
    shadow: {
      offsetX: 0,
      offsetY: 8,
      blur: 24,
      color: "rgba(0, 0, 0, 0.15)",
    },
    border: {
      width: 1,
      color: "#e5e7eb",
      radius: 8,
    },
    padding: 16,
  },
  {
    id: "polaroid",
    name: "폴라로이드",
    category: "polaroid",
    description: "클래식 폴라로이드 스타일",
    ticketArea: { x: 0.06, y: 0.04, width: 0.88, height: 0.72 },
    backgroundColor: "#fefefe",
    shadow: {
      offsetX: 2,
      offsetY: 4,
      blur: 16,
      color: "rgba(0, 0, 0, 0.2)",
    },
    border: {
      width: 0,
      color: "transparent",
      radius: 2,
    },
    padding: 12,
  },
  {
    id: "film-strip",
    name: "필름 스트립",
    category: "film",
    description: "35mm 필름 스트립 스타일",
    ticketArea: { x: 0.1, y: 0.15, width: 0.8, height: 0.7 },
    backgroundColor: "#1a1a1a",
    shadow: {
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      color: "rgba(0, 0, 0, 0.4)",
    },
    padding: 8,
    decorator: "filmHoles",
  },
  {
    id: "neon-purple",
    name: "네온 퍼플",
    category: "neon",
    description: "화려한 네온 글로우 효과",
    ticketArea: { x: 0.06, y: 0.06, width: 0.88, height: 0.88 },
    backgroundColor: "#0f0f23",
    shadow: {
      offsetX: 0,
      offsetY: 0,
      blur: 30,
      color: "rgba(168, 85, 247, 0.6)",
    },
    border: {
      width: 3,
      color: "#a855f7",
      radius: 12,
    },
    padding: 12,
  },
  {
    id: "vintage-cream",
    name: "빈티지 크림",
    category: "vintage",
    description: "따뜻한 빈티지 톤",
    ticketArea: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
    backgroundColor: "#f5f0e1",
    shadow: {
      offsetX: 3,
      offsetY: 3,
      blur: 10,
      color: "rgba(139, 119, 101, 0.3)",
    },
    border: {
      width: 2,
      color: "#d4c5a9",
      radius: 4,
    },
    padding: 20,
    decorator: "vintageBorder",
  },
];

/**
 * ID로 템플릿 찾기
 */
export function getTemplateById(id: string): TicketTemplate | undefined {
  return TICKET_TEMPLATES.find((t) => t.id === id);
}

/**
 * 카테고리별 템플릿 필터링
 */
export function getTemplatesByCategory(
  category: TicketTemplate["category"]
): TicketTemplate[] {
  return TICKET_TEMPLATES.filter((t) => t.category === category);
}
