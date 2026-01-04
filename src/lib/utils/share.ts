/**
 * 공유 유틸리티
 * - Web Share API
 * - 클립보드 복사
 * - 이미지 다운로드
 */

export interface ShareData {
    title?: string;
    text?: string;
    url?: string;
}

export interface ShareImageData extends ShareData {
    imageDataUrl?: string;
    fileName?: string;
}

/**
 * Web Share API를 사용하여 콘텐츠 공유
 * 지원하지 않으면 클립보드에 URL 복사
 */
export async function shareContent(data: ShareData): Promise<"shared" | "copied" | "error"> {
    const shareData: ShareData = {
        title: data.title,
        text: data.text,
        url: data.url || window.location.href,
    };

    try {
        if (navigator.share && navigator.canShare?.(shareData)) {
            await navigator.share(shareData);
            return "shared";
        } else {
            await copyToClipboard(shareData.url || window.location.href);
            return "copied";
        }
    } catch (error) {
        if ((error as Error).name === "AbortError") {
            return "shared"; // 사용자가 취소한 경우
        }
        // Fallback: URL 복사
        try {
            await copyToClipboard(shareData.url || window.location.href);
            return "copied";
        } catch {
            return "error";
        }
    }
}

/**
 * 이미지를 포함하여 공유 (Web Share API Level 2)
 */
export async function shareImage(
    imageDataUrl: string,
    title: string,
    options?: { text?: string; url?: string }
): Promise<"shared" | "downloaded" | "error"> {
    try {
        // Data URL을 Blob으로 변환
        const blob = dataUrlToBlob(imageDataUrl);
        const file = new File([blob], `${title}.png`, { type: "image/png" });

        const shareData = {
            title,
            text: options?.text,
            url: options?.url,
            files: [file],
        };

        // Web Share API Level 2 (파일 공유) 지원 확인
        if (navigator.share && navigator.canShare?.(shareData)) {
            await navigator.share(shareData);
            return "shared";
        } else {
            // Fallback: 이미지 다운로드
            downloadImage(imageDataUrl, `${title}.png`);
            return "downloaded";
        }
    } catch (error) {
        if ((error as Error).name === "AbortError") {
            return "shared";
        }
        // Fallback: 이미지 다운로드
        try {
            downloadImage(imageDataUrl, `${title}.png`);
            return "downloaded";
        } catch {
            return "error";
        }
    }
}

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback: execCommand 사용
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * 이미지 다운로드
 */
export function downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Blob을 다운로드
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Data URL을 Blob으로 변환
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Blob을 Data URL로 변환
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 공유 URL 생성 (짧은 ID 포함)
 */
export function generateShareId(length: number = 8): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 공유 URL 생성
 */
export function getShareUrl(shareId: string): string {
    const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://fesmate.app";
    return `${baseUrl}/share/tickets/${shareId}`;
}
