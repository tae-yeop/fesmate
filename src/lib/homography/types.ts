/**
 * 호모그래피 변환을 위한 타입 정의
 */

/** 2D 좌표 포인트 */
export type Point = [number, number];

/** 4개의 꼭지점 (순서: top-left, top-right, bottom-right, bottom-left) */
export type QuadPoints = [Point, Point, Point, Point];

/** 이미지 변환 결과 */
export interface WarpResult {
  width: number;
  height: number;
  imageData?: ImageData;
}

/** 미리보기 스케일 정보 */
export interface PreviewScale {
  scale: number;
  previewWidth: number;
  previewHeight: number;
  originalWidth: number;
  originalHeight: number;
}

/** 워프 옵션 */
export interface WarpOptions {
  /** 미리보기 모드 (저해상도 처리) */
  preview?: boolean;
  /** 미리보기 최대 치수 */
  maxPreviewDimension?: number;
}

/** 코너 포인트 에디터 상태 */
export interface CornerEditorState {
  /** 현재 선택된 꼭지점 인덱스 (0-3, null이면 선택 없음) */
  activeCornerIndex: number | null;
  /** 4개의 꼭지점 좌표 (미리보기 기준) */
  corners: QuadPoints;
  /** 미리보기 스케일 정보 */
  previewScale: PreviewScale;
  /** 드래그 중 여부 */
  isDragging: boolean;
}
