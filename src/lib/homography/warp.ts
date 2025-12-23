/**
 * 호모그래피 워프 함수
 * - 순수 Canvas 2D 기반 원근 변환 (외부 라이브러리 없음)
 * - 역매핑 방식으로 선택한 쿼드 영역을 직사각형으로 변환
 */

import type { QuadPoints, WarpResult, PreviewScale } from "./types";
import {
  estimateOutputSize,
  quadPreviewToOriginal,
} from "./quad-utils";

/** 미리보기용 기본 최대 치수 */
const DEFAULT_PREVIEW_MAX_DIMENSION = 800;

/**
 * 3x3 행렬 타입
 */
type Matrix3x3 = number[][];

/**
 * 호모그래피 행렬을 계산합니다.
 * src 쿼드의 4점을 dst 쿼드의 4점으로 매핑하는 행렬
 */
function computeHomographyMatrix(
  src: QuadPoints,
  dst: QuadPoints
): Matrix3x3 {
  // 8개의 대응점으로 호모그래피 행렬 계산 (DLT 알고리즘)
  const A: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];

    A.push([-sx, -sy, -1, 0, 0, 0, sx * dx, sy * dx, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, sx * dy, sy * dy, dy]);
  }

  // SVD 대신 간단한 가우스 소거법으로 해 계산
  const h = solveHomography(A);

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

/**
 * 가우스 소거법으로 호모그래피 행렬의 8개 파라미터를 계산
 */
function solveHomography(A: number[][]): number[] {
  const n = 8;
  const augmented = A.map((row, i) => [...row.slice(0, n), -row[n]]);

  // 전진 소거
  for (let col = 0; col < n; col++) {
    // 피벗 선택
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    const pivot = augmented[col][col];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = col; j <= n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = augmented[row][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
  }

  return augmented.map(row => row[n]);
}

/**
 * 호모그래피 행렬의 역행렬을 계산합니다.
 */
function invertMatrix3x3(m: Matrix3x3): Matrix3x3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

  if (Math.abs(det) < 1e-10) {
    throw new Error("행렬이 특이점에 있습니다.");
  }

  const invDet = 1 / det;

  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

/**
 * 호모그래피 행렬을 사용하여 점을 변환합니다.
 */
function transformPoint(H: Matrix3x3, x: number, y: number): [number, number] {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  const px = (H[0][0] * x + H[0][1] * y + H[0][2]) / w;
  const py = (H[1][0] * x + H[1][1] * y + H[1][2]) / w;
  return [px, py];
}

/**
 * homography 라이브러리를 프리로드합니다.
 * (호환성을 위해 유지, 실제로는 아무 작업도 하지 않음)
 */
export function preloadHomography(): void {
  // Canvas 기반 구현이므로 프리로드 불필요
}

/**
 * 이미지를 호모그래피 변환하여 정면으로 펴줍니다.
 * 선택한 쿼드 영역만 crop하여 직사각형으로 변환합니다.
 *
 * @param imageEl - 원본 이미지 엘리먼트
 * @param quadPoints - 4개의 꼭지점 좌표 (미리보기 기준, TL, TR, BR, BL 순서)
 * @param previewScale - 미리보기 스케일 정보 (null이면 원본 좌표로 간주)
 * @param outputCanvas - 결과를 그릴 캔버스
 * @returns 변환된 이미지의 크기
 */
export async function warpImage(
  imageEl: HTMLImageElement,
  quadPoints: QuadPoints,
  previewScale: PreviewScale | null,
  outputCanvas: HTMLCanvasElement
): Promise<WarpResult> {
  // 미리보기 좌표 → 원본 좌표 변환
  const originalQuad = previewScale
    ? quadPreviewToOriginal(quadPoints, previewScale)
    : quadPoints;

  // 출력 크기 추정 (쿼드의 평균 너비/높이)
  const { w, h } = estimateOutputSize(originalQuad);

  // 출력 직사각형의 꼭지점 (TL, TR, BR, BL)
  const dstQuad: QuadPoints = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];

  // 역변환 행렬 계산: dst → src
  // 출력의 각 픽셀(dst)이 원본 이미지(src)의 어느 위치에서 오는지 계산
  const H = computeHomographyMatrix(dstQuad, originalQuad);

  // 원본 이미지를 Canvas에 로드
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageEl.naturalWidth;
  srcCanvas.height = imageEl.naturalHeight;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) {
    throw new Error("Source canvas context를 생성할 수 없습니다.");
  }
  srcCtx.drawImage(imageEl, 0, 0);
  const srcImageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const srcData = srcImageData.data;
  const srcWidth = srcCanvas.width;
  const srcHeight = srcCanvas.height;

  // 출력 Canvas 설정
  outputCanvas.width = w;
  outputCanvas.height = h;
  const ctx = outputCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Output canvas context를 생성할 수 없습니다.");
  }

  // 출력 ImageData 생성
  const outImageData = ctx.createImageData(w, h);
  const outData = outImageData.data;

  // 역매핑: 출력 픽셀마다 원본 좌표를 계산하여 샘플링
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      // 출력 좌표를 원본 좌표로 변환
      const [sx, sy] = transformPoint(H, dx, dy);

      // 원본 이미지 범위 체크
      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        // 바이리니어 보간
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const fx = sx - x0;
        const fy = sy - y0;

        const idx00 = (y0 * srcWidth + x0) * 4;
        const idx10 = (y0 * srcWidth + x1) * 4;
        const idx01 = (y1 * srcWidth + x0) * 4;
        const idx11 = (y1 * srcWidth + x1) * 4;

        const outIdx = (dy * w + dx) * 4;

        for (let c = 0; c < 4; c++) {
          const v00 = srcData[idx00 + c];
          const v10 = srcData[idx10 + c];
          const v01 = srcData[idx01 + c];
          const v11 = srcData[idx11 + c];

          // 바이리니어 보간
          const v = (1 - fx) * (1 - fy) * v00 +
                    fx * (1 - fy) * v10 +
                    (1 - fx) * fy * v01 +
                    fx * fy * v11;

          outData[outIdx + c] = Math.round(v);
        }
      } else {
        // 범위 밖은 투명
        const outIdx = (dy * w + dx) * 4;
        outData[outIdx + 3] = 0; // alpha = 0
      }
    }
  }

  // 결과를 Canvas에 그리기
  ctx.putImageData(outImageData, 0, 0);

  return {
    width: w,
    height: h,
    imageData: outImageData,
  };
}

/**
 * 미리보기용 저해상도 워프
 * UI에서 드래그 중 실시간 피드백용
 */
export async function warpImagePreview(
  imageEl: HTMLImageElement,
  quadPoints: QuadPoints,
  previewScale: PreviewScale,
  outputCanvas: HTMLCanvasElement,
  maxDimension: number = DEFAULT_PREVIEW_MAX_DIMENSION
): Promise<WarpResult> {
  // 미리보기용 다운스케일 이미지 생성
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = previewScale.previewWidth;
  previewCanvas.height = previewScale.previewHeight;

  const previewCtx = previewCanvas.getContext("2d");
  if (!previewCtx) {
    throw new Error("Canvas context를 생성할 수 없습니다.");
  }

  previewCtx.drawImage(
    imageEl,
    0,
    0,
    previewScale.previewWidth,
    previewScale.previewHeight
  );

  // 미리보기 이미지로 워프 (좌표는 이미 미리보기 기준)
  const previewImage = new Image();
  await new Promise<void>((resolve, reject) => {
    previewImage.onload = () => resolve();
    previewImage.onerror = reject;
    previewImage.src = previewCanvas.toDataURL();
  });

  // 미리보기 좌표 그대로 사용 (이미 스케일링된 좌표)
  return warpImage(previewImage, quadPoints, null, outputCanvas);
}

/**
 * Canvas 데이터를 Blob으로 변환합니다.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Blob 변환에 실패했습니다."));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Canvas 데이터를 Data URL로 변환합니다.
 */
export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality: number = 0.92
): string {
  return canvas.toDataURL(type, quality);
}

/**
 * 이미지 URL에서 HTMLImageElement를 로드합니다.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 로드에 실패했습니다."));
    img.src = url;
  });
}
