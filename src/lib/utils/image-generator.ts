/**
 * 이미지 생성 유틸리티
 * - html2canvas 기반 요소 캡처
 * - 인스타 스토리용 이미지 생성
 * - 리포트 카드 이미지 생성
 */

import html2canvas, { Options } from "html2canvas";

/**
 * html2canvas 기본 옵션
 */
const DEFAULT_OPTIONS: Partial<Options> = {
    scale: 2, // 고해상도
    useCORS: true, // 외부 이미지 허용
    allowTaint: true,
    backgroundColor: null, // 투명 배경
    logging: false,
};

/**
 * DOM 요소를 캔버스로 캡처
 */
export async function captureElement(
    element: HTMLElement,
    options?: Partial<Options>
): Promise<HTMLCanvasElement> {
    const canvas = await html2canvas(element, {
        ...DEFAULT_OPTIONS,
        ...options,
    });
    return canvas;
}

/**
 * DOM 요소를 Data URL로 캡처
 */
export async function captureElementAsDataUrl(
    element: HTMLElement,
    options?: Partial<Options> & { format?: "png" | "jpeg" | "webp"; quality?: number }
): Promise<string> {
    const { format = "png", quality = 0.92, ...canvasOptions } = options || {};
    const canvas = await captureElement(element, canvasOptions);
    return canvas.toDataURL(`image/${format}`, quality);
}

/**
 * DOM 요소를 Blob으로 캡처
 */
export async function captureElementAsBlob(
    element: HTMLElement,
    options?: Partial<Options> & { format?: "png" | "jpeg" | "webp"; quality?: number }
): Promise<Blob> {
    const { format = "png", quality = 0.92, ...canvasOptions } = options || {};
    const canvas = await captureElement(element, canvasOptions);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Failed to create blob from canvas"));
                }
            },
            `image/${format}`,
            quality
        );
    });
}

/**
 * 인스타그램 스토리용 이미지 크기 (9:16 비율)
 */
export const INSTAGRAM_STORY_SIZE = {
    width: 1080,
    height: 1920,
};

/**
 * 인스타 스토리용 이미지 생성
 * @param element 캡처할 요소 (InstaStoryTemplate)
 */
export async function generateStoryImage(element: HTMLElement): Promise<string> {
    const canvas = await captureElement(element, {
        width: INSTAGRAM_STORY_SIZE.width,
        height: INSTAGRAM_STORY_SIZE.height,
        scale: 1, // 정확한 크기 유지
    });
    return canvas.toDataURL("image/png");
}

/**
 * 리포트 카드 이미지 크기 (1:1 비율)
 */
export const REPORT_CARD_SIZE = {
    width: 1080,
    height: 1080,
};

/**
 * 리포트 카드 이미지 생성
 * @param element 캡처할 요소 (YearlyReportCard)
 */
export async function generateReportCardImage(element: HTMLElement): Promise<string> {
    const canvas = await captureElement(element, {
        width: REPORT_CARD_SIZE.width,
        height: REPORT_CARD_SIZE.height,
        scale: 1,
    });
    return canvas.toDataURL("image/png");
}

/**
 * 티켓 이미지 캡처 (원본 크기 유지)
 * @param element 티켓 이미지 요소
 */
export async function captureTicketImage(element: HTMLElement): Promise<string> {
    return captureElementAsDataUrl(element, {
        scale: 2, // 고해상도
        backgroundColor: "#ffffff",
    });
}

/**
 * 이미지 URL을 Data URL로 변환
 * CORS 문제 회피를 위해 fetch 사용
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
    // 이미 Data URL이면 그대로 반환
    if (url.startsWith("data:")) {
        return url;
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("[imageUrlToDataUrl] Error:", error);
        throw error;
    }
}

/**
 * 이미지 리사이즈
 */
export async function resizeImage(
    imageDataUrl: string,
    maxWidth: number,
    maxHeight: number
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // 비율 유지하며 리사이즈
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = imageDataUrl;
    });
}

/**
 * 캔버스에 둥근 모서리 적용
 */
export function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
