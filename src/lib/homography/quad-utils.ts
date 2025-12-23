/**
 * 4점 쿼드 유틸리티 함수
 * - 꼭지점 순서 정규화
 * - 출력 크기 계산
 * - 좌표 변환
 */

import type { Point, QuadPoints, PreviewScale } from "./types";

/**
 * 4점의 순서를 정규화합니다.
 * 입력: 임의 순서의 4개 점
 * 출력: [top-left, top-right, bottom-right, bottom-left] (시계방향)
 *
 * 알고리즘:
 * - x+y 합이 가장 작은 점 = top-left
 * - x+y 합이 가장 큰 점 = bottom-right
 * - x-y 차이가 가장 큰 점 = top-right
 * - x-y 차이가 가장 작은 점 = bottom-left
 */
export function orderQuad(points: Point[]): QuadPoints {
  if (points.length !== 4) {
    throw new Error("4개의 꼭지점이 필요합니다.");
  }

  const pts = points.map(([x, y]) => ({ x, y, original: [x, y] as Point }));
  const sum = pts.map((p) => p.x + p.y);
  const diff = pts.map((p) => p.x - p.y);

  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];
  const tr = pts[diff.indexOf(Math.max(...diff))];
  const bl = pts[diff.indexOf(Math.min(...diff))];

  return [tl.original, tr.original, br.original, bl.original];
}

/**
 * 두 점 사이의 거리를 계산합니다.
 */
export function distance(a: Point, b: Point): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

/**
 * 펴진 결과 사각형의 크기를 추정합니다.
 * - width = 상단 변과 하단 변 길이의 평균
 * - height = 좌측 변과 우측 변 길이의 평균
 */
export function estimateOutputSize(
  quad: QuadPoints
): { w: number; h: number } {
  const [tl, tr, br, bl] = quad;

  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);

  const w = Math.round((topWidth + bottomWidth) / 2);
  const h = Math.round((leftHeight + rightHeight) / 2);

  return {
    w: Math.max(w, 1),
    h: Math.max(h, 1),
  };
}

/**
 * 미리보기 좌표를 원본 이미지 좌표로 변환합니다.
 */
export function previewToOriginal(
  point: Point,
  previewScale: PreviewScale
): Point {
  return [point[0] / previewScale.scale, point[1] / previewScale.scale];
}

/**
 * 원본 이미지 좌표를 미리보기 좌표로 변환합니다.
 */
export function originalToPreview(
  point: Point,
  previewScale: PreviewScale
): Point {
  return [point[0] * previewScale.scale, point[1] * previewScale.scale];
}

/**
 * 4점 모두를 미리보기 좌표에서 원본 좌표로 변환합니다.
 */
export function quadPreviewToOriginal(
  quad: QuadPoints,
  previewScale: PreviewScale
): QuadPoints {
  return quad.map((p) => previewToOriginal(p, previewScale)) as QuadPoints;
}

/**
 * 이미지 치수에서 미리보기 스케일 정보를 계산합니다.
 */
export function calculatePreviewScale(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number = 800
): PreviewScale {
  const scale = Math.min(
    1,
    maxDimension / Math.max(originalWidth, originalHeight)
  );

  return {
    scale,
    previewWidth: Math.round(originalWidth * scale),
    previewHeight: Math.round(originalHeight * scale),
    originalWidth,
    originalHeight,
  };
}

/**
 * 이미지 크기 기준으로 기본 꼭지점을 생성합니다.
 * 여백을 두고 사각형 영역을 초기화합니다.
 */
export function createDefaultCorners(
  width: number,
  height: number,
  margin: number = 0.1
): QuadPoints {
  const mx = width * margin;
  const my = height * margin;

  return [
    [mx, my], // top-left
    [width - mx, my], // top-right
    [width - mx, height - my], // bottom-right
    [mx, height - my], // bottom-left
  ];
}

/**
 * 꼭지점이 이미지 경계 내에 있는지 확인하고 보정합니다.
 */
export function clampPointToImage(
  point: Point,
  width: number,
  height: number,
  padding: number = 10
): Point {
  return [
    Math.max(padding, Math.min(width - padding, point[0])),
    Math.max(padding, Math.min(height - padding, point[1])),
  ];
}
