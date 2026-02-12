/**
 * SNS 공유 유틸리티
 * - 플랫폼별 공유 URL 생성
 * - Web Share API 지원
 * - Instagram Story 이미지 생성
 */

export type SharePlatform = 'instagram' | 'twitter' | 'facebook' | 'kakao' | 'clipboard' | 'native';

export interface ShareContent {
    title: string;
    text: string;
    url: string;
    imageUrl?: string;
    hashtags?: string[];
}

export interface StoryImageOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    scale?: number;
}

/**
 * 플랫폼별 공유 URL 생성
 */
export function getShareUrl(platform: SharePlatform, content: ShareContent): string {
    const encodedTitle = encodeURIComponent(content.title);
    const encodedText = encodeURIComponent(content.text);
    const encodedUrl = encodeURIComponent(content.url);
    const hashtagsString = content.hashtags?.length 
        ? content.hashtags.map(h => h.startsWith('#') ? h.slice(1) : h).join(',')
        : '';

    switch (platform) {
        case 'twitter':
            const twitterText = `${content.text}${content.hashtags?.length ? '\n' + content.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : ''}`;
            return `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodedUrl}`;

        case 'facebook':
            return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;

        case 'kakao':
            // 카카오톡 공유는 SDK 사용이 권장되지만, 모바일 웹 공유 URL 제공
            // 실제로는 카카오톡 SDK를 사용하거나 Web Share API 폴백
            return `https://story.kakao.com/share?url=${encodedUrl}`;

        case 'instagram':
            // 인스타그램은 직접 URL 공유 지원 안함 - 이미지 다운로드 후 앱에서 업로드
            return '';

        case 'clipboard':
        case 'native':
        default:
            return content.url;
    }
}

/**
 * Web Share API 사용 가능 여부 확인
 */
export function canUseNativeShare(): boolean {
    return typeof navigator !== 'undefined' && 
           typeof navigator.share === 'function' &&
           typeof navigator.canShare === 'function';
}

/**
 * 파일 공유 가능 여부 확인
 */
export function canShareFiles(): boolean {
    if (!canUseNativeShare()) return false;
    try {
        return navigator.canShare({ files: [new File([''], 'test.txt', { type: 'text/plain' })] });
    } catch {
        return false;
    }
}

/**
 * Native Share API로 콘텐츠 공유
 * @returns 성공 여부
 */
export async function shareContent(content: ShareContent): Promise<boolean> {
    if (!canUseNativeShare()) {
        // 폴백: 클립보드에 복사
        return copyToClipboard(`${content.title}\n${content.text}\n${content.url}`);
    }

    const shareData: ShareData = {
        title: content.title,
        text: content.text,
        url: content.url,
    };

    try {
        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return true;
        }
        return copyToClipboard(`${content.title}\n${content.text}\n${content.url}`);
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            return true; // 사용자가 취소한 경우
        }
        return copyToClipboard(`${content.title}\n${content.text}\n${content.url}`);
    }
}

/**
 * 이미지와 함께 콘텐츠 공유
 */
export async function shareWithImage(content: ShareContent, imageBlob: Blob): Promise<boolean> {
    if (!canShareFiles()) {
        // 폴백: 이미지 다운로드
        downloadImageFromBlob(imageBlob, `${content.title.replace(/\s+/g, '_')}.png`);
        return true;
    }

    const file = new File([imageBlob], `${content.title.replace(/\s+/g, '_')}.png`, { 
        type: 'image/png' 
    });

    const shareData = {
        title: content.title,
        text: content.text,
        url: content.url,
        files: [file],
    };

    try {
        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return true;
        }
        downloadImageFromBlob(imageBlob, `${content.title.replace(/\s+/g, '_')}.png`);
        return true;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            return true;
        }
        downloadImageFromBlob(imageBlob, `${content.title.replace(/\s+/g, '_')}.png`);
        return true;
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
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        } catch {
            return false;
        }
    }
}

/**
 * HTML Element를 Canvas로 변환하여 이미지 생성
 * html2canvas 없이 Canvas API 직접 사용
 */
export async function generateStoryImage(
    element: HTMLElement,
    options: StoryImageOptions = {}
): Promise<Blob> {
    const {
        width = 1080,
        height = 1920,
        scale = 1,
    } = options;

    // html2canvas 동적 임포트
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
        width: width,
        height: height,
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to generate image blob'));
                }
            },
            'image/png',
            1.0
        );
    });
}

/**
 * Canvas를 사용하여 스토리 이미지 직접 생성 (html2canvas 없이)
 */
export async function generateStoryImageFromData(
    data: {
        backgroundGradient?: [string, string];
        backgroundColor?: string;
        imageUrl?: string;
        title: string;
        subtitle?: string;
        watermark?: string;
        badges?: string[];
    },
    options: StoryImageOptions = {}
): Promise<Blob> {
    const {
        width = 1080,
        height = 1920,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 배경
    if (data.backgroundGradient) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, data.backgroundGradient[0]);
        gradient.addColorStop(1, data.backgroundGradient[1]);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = data.backgroundColor || '#1a1a2e';
    }
    ctx.fillRect(0, 0, width, height);

    // 이미지가 있으면 로드
    if (data.imageUrl) {
        try {
            const img = await loadImage(data.imageUrl);
            const imgWidth = Math.min(width * 0.8, img.width);
            const imgHeight = (imgWidth / img.width) * img.height;
            const x = (width - imgWidth) / 2;
            const y = height * 0.2;
            
            // 이미지 그림자
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 20;
            
            // 둥근 모서리로 이미지 그리기
            roundedImage(ctx, img, x, y, imgWidth, imgHeight, 24);
            
            ctx.shadowColor = 'transparent';
        } catch (error) {
            console.error('Failed to load image:', error);
        }
    }

    // 제목
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 텍스트 그림자
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    
    wrapText(ctx, data.title, width / 2, height * 0.75, width * 0.85, 80);
    
    // 부제목
    if (data.subtitle) {
        ctx.font = '400 40px "Noto Sans KR", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(data.subtitle, width / 2, height * 0.82);
    }

    // 배지
    if (data.badges && data.badges.length > 0) {
        ctx.font = '48px sans-serif';
        const badgeY = height * 0.1;
        const badgeSpacing = 60;
        const startX = width / 2 - ((data.badges.length - 1) * badgeSpacing) / 2;
        
        data.badges.forEach((badge, i) => {
            ctx.fillText(badge, startX + i * badgeSpacing, badgeY);
        });
    }

    // 워터마크
    ctx.shadowColor = 'transparent';
    if (data.watermark) {
        ctx.font = '32px "Noto Sans KR", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(data.watermark, width / 2, height * 0.95);
    }

    // FesMate 로고
    ctx.font = 'bold 36px "Noto Sans KR", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('FesMate', width / 2, height * 0.97);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to generate image blob'));
                }
            },
            'image/png',
            1.0
        );
    });
}

/**
 * 이미지 로드 헬퍼
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * 둥근 모서리로 이미지 그리기
 */
function roundedImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.save();
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
    ctx.clip();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
}

/**
 * 텍스트 줄바꿈
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): void {
    const words = text.split('');
    let line = '';
    let currentY = y;
    const lines: string[] = [];

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
            lines.push(line);
            line = words[i];
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    // 중앙 정렬을 위해 시작 y 조정
    const totalHeight = lines.length * lineHeight;
    currentY = y - totalHeight / 2 + lineHeight / 2;

    for (const l of lines) {
        ctx.fillText(l, x, currentY);
        currentY += lineHeight;
    }
}

/**
 * Blob을 이용하여 이미지 다운로드
 */
export function downloadImageFromBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Data URL을 이용하여 이미지 다운로드
 */
export function downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
 * Data URL을 Blob으로 변환
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * 모바일 환경 확인
 */
export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Instagram 앱 열기 시도 (모바일만)
 */
export function openInstagramApp(): void {
    if (isMobileDevice()) {
        // 딜레이 후 인스타그램 스토리 카메라 열기 시도
        setTimeout(() => {
            window.location.href = 'instagram://story-camera';
        }, 300);
    }
}

/**
 * Twitter 공유 창 열기
 */
export function openTwitterShare(content: ShareContent): void {
    const url = getShareUrl('twitter', content);
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
}

/**
 * Facebook 공유 창 열기
 */
export function openFacebookShare(content: ShareContent): void {
    const url = getShareUrl('facebook', content);
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
}

/**
 * Kakao 공유 (SDK 없이 URL 공유)
 */
export function openKakaoShare(content: ShareContent): void {
    // Kakao SDK가 있으면 사용, 없으면 카카오스토리로 폴백
    if (typeof window !== 'undefined' && (window as { Kakao?: { isInitialized: () => boolean; Share: { sendDefault: (params: unknown) => void } } }).Kakao?.isInitialized?.()) {
        const Kakao = (window as { Kakao: { Share: { sendDefault: (params: { objectType: string; content: { title: string; description: string; imageUrl?: string; link: { mobileWebUrl: string; webUrl: string } }; buttons: { title: string; link: { mobileWebUrl: string; webUrl: string } }[] }) => void } } }).Kakao;
        Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: content.title,
                description: content.text,
                imageUrl: content.imageUrl,
                link: {
                    mobileWebUrl: content.url,
                    webUrl: content.url,
                },
            },
            buttons: [
                {
                    title: '자세히 보기',
                    link: {
                        mobileWebUrl: content.url,
                        webUrl: content.url,
                    },
                },
            ],
        });
    } else {
        // 카카오스토리로 폴백
        const url = getShareUrl('kakao', content);
        window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
    }
}

/**
 * 스토리 템플릿 타입
 */
export type StoryTemplateType = 'ticket' | 'poster' | 'text' | 'collage';

/**
 * 스토리 템플릿 설정
 */
export interface StoryTemplateConfig {
    type: StoryTemplateType;
    backgroundType: 'gradient' | 'solid' | 'image';
    backgroundColor?: string;
    gradientColors?: [string, string];
    backgroundImageUrl?: string;
    textColor: 'light' | 'dark';
    showWatermark: boolean;
    watermarkText?: string;
    badges?: string[];
}

/**
 * 기본 템플릿 설정
 */
export const DEFAULT_STORY_TEMPLATES: Record<StoryTemplateType, StoryTemplateConfig> = {
    ticket: {
        type: 'ticket',
        backgroundType: 'gradient',
        gradientColors: ['#4c1d95', '#be185d'],
        textColor: 'light',
        showWatermark: true,
        badges: [],
    },
    poster: {
        type: 'poster',
        backgroundType: 'gradient',
        gradientColors: ['#1e3a5f', '#0f172a'],
        textColor: 'light',
        showWatermark: true,
        badges: [],
    },
    text: {
        type: 'text',
        backgroundType: 'gradient',
        gradientColors: ['#f97316', '#ec4899'],
        textColor: 'light',
        showWatermark: true,
        badges: [],
    },
    collage: {
        type: 'collage',
        backgroundType: 'solid',
        backgroundColor: '#18181b',
        textColor: 'light',
        showWatermark: true,
        badges: [],
    },
};

/**
 * 그라데이션 프리셋
 */
export const GRADIENT_PRESETS: Array<{ name: string; colors: [string, string] }> = [
    { name: 'Sunset', colors: ['#f97316', '#ec4899'] },
    { name: 'Ocean', colors: ['#06b6d4', '#3b82f6'] },
    { name: 'Forest', colors: ['#22c55e', '#14b8a6'] },
    { name: 'Night', colors: ['#4c1d95', '#be185d'] },
    { name: 'Midnight', colors: ['#1e3a5f', '#0f172a'] },
    { name: 'Fire', colors: ['#ef4444', '#f97316'] },
    { name: 'Royal', colors: ['#7c3aed', '#2563eb'] },
    { name: 'Rose', colors: ['#f43f5e', '#fb7185'] },
];

/**
 * 스티커/배지 목록
 */
export const STORY_BADGES: string[] = [
    '🎵', '🎤', '🎸', '🎹', '🎺', '🎻', '🥁', '🎧',
    '🎪', '🎭', '🎨', '🎬', '📸', '🌟', '✨', '💫',
    '🔥', '❤️', '💜', '💙', '🧡', '💚', '💛', '🤍',
    '🎉', '🎊', '🥳', '🙌', '👏', '🤟', '🤘', '✌️',
];
