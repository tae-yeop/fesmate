/**
 * 티켓 템플릿 타입 정의
 */

/** 템플릿 카테고리 */
export type TemplateCategory = "simple" | "polaroid" | "film" | "neon" | "vintage";

/** 템플릿 정의 */
export interface TicketTemplate {
  /** 고유 ID */
  id: string;
  /** 표시 이름 */
  name: string;
  /** 카테고리 */
  category: TemplateCategory;
  /** 설명 */
  description: string;
  /** 티켓 이미지가 들어갈 영역 (비율 기준) */
  ticketArea: {
    x: number;  // 0-1 (왼쪽 기준 비율)
    y: number;  // 0-1 (위쪽 기준 비율)
    width: number;  // 0-1 (너비 비율)
    height: number; // 0-1 (높이 비율)
  };
  /** 캔버스 배경색 */
  backgroundColor: string;
  /** 그림자 설정 */
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  /** 테두리 설정 */
  border?: {
    width: number;
    color: string;
    radius: number;
  };
  /** 내부 여백 (px) */
  padding: number;
  /** 추가 장식 렌더링 함수 이름 */
  decorator?: string;
}

/** 템플릿 렌더링 옵션 */
export interface RenderOptions {
  /** 출력 너비 */
  outputWidth: number;
  /** 출력 높이 (지정하지 않으면 비율 유지) */
  outputHeight?: number;
  /** 품질 (0-1) */
  quality?: number;
}

/** 합성 결과 */
export interface CompositeResult {
  /** 결과 캔버스 */
  canvas: HTMLCanvasElement;
  /** 결과 Data URL */
  dataUrl: string;
  /** 결과 치수 */
  width: number;
  height: number;
}
