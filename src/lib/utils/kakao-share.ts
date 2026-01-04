/**
 * 카카오톡 공유 유틸리티
 * - Kakao JavaScript SDK 초기화
 * - 링크 공유
 * - 커스텀 템플릿 공유
 */

declare global {
    interface Window {
        Kakao?: {
            init: (key: string) => void;
            isInitialized: () => boolean;
            cleanup: () => void;
            Share: {
                sendDefault: (settings: KakaoShareSettings) => void;
                sendCustom: (settings: { templateId: number; templateArgs?: Record<string, string> }) => void;
            };
        };
    }
}

interface KakaoShareSettings {
    objectType: "feed" | "list" | "location" | "commerce" | "text";
    content: {
        title: string;
        description?: string;
        imageUrl?: string;
        link: {
            mobileWebUrl?: string;
            webUrl?: string;
        };
    };
    social?: {
        likeCount?: number;
        commentCount?: number;
        sharedCount?: number;
    };
    buttons?: Array<{
        title: string;
        link: {
            mobileWebUrl?: string;
            webUrl?: string;
        };
    }>;
}

/**
 * Kakao SDK 스크립트 로드
 */
export function loadKakaoSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
        // 이미 로드되어 있으면 바로 반환
        if (window.Kakao) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js";
        script.integrity = "sha384-l+xbElFSnPZ2rOaPrU//2FF5B4LB8FiX5q4fXYTlfcG4PGpMkE1vcL7kNXI6Cci0";
        script.crossOrigin = "anonymous";
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Kakao SDK"));

        document.head.appendChild(script);
    });
}

/**
 * Kakao SDK 초기화
 */
export async function initKakao(): Promise<boolean> {
    const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

    if (!kakaoJsKey) {
        console.warn("[Kakao] NEXT_PUBLIC_KAKAO_JS_KEY is not set");
        return false;
    }

    try {
        await loadKakaoSdk();

        if (!window.Kakao) {
            console.error("[Kakao] SDK not loaded");
            return false;
        }

        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(kakaoJsKey);
        }

        return true;
    } catch (error) {
        console.error("[Kakao] Init error:", error);
        return false;
    }
}

/**
 * 카카오톡으로 링크 공유
 */
export interface KakaoShareOptions {
    title: string;
    description?: string;
    imageUrl?: string;
    url: string;
    buttonText?: string;
}

export async function shareToKakao(options: KakaoShareOptions): Promise<boolean> {
    const initialized = await initKakao();

    if (!initialized || !window.Kakao) {
        console.error("[Kakao] Not initialized");
        return false;
    }

    try {
        window.Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
                title: options.title,
                description: options.description,
                imageUrl: options.imageUrl,
                link: {
                    mobileWebUrl: options.url,
                    webUrl: options.url,
                },
            },
            buttons: [
                {
                    title: options.buttonText || "자세히 보기",
                    link: {
                        mobileWebUrl: options.url,
                        webUrl: options.url,
                    },
                },
            ],
        });

        return true;
    } catch (error) {
        console.error("[Kakao] Share error:", error);
        return false;
    }
}

/**
 * 티켓 정보를 카카오톡으로 공유
 */
export interface TicketShareInfo {
    eventTitle: string;
    eventDate: string;
    eventId: string;
    imageUrl?: string;
}

export async function shareTicketToKakao(ticket: TicketShareInfo): Promise<boolean> {
    const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://fesmate.app";

    return shareToKakao({
        title: `[FesMate] ${ticket.eventTitle}`,
        description: ticket.eventDate,
        imageUrl: ticket.imageUrl,
        url: `${baseUrl}/event/${ticket.eventId}`,
        buttonText: "FesMate에서 보기",
    });
}

/**
 * 공유 페이지를 카카오톡으로 공유
 */
export async function shareGalleryToKakao(
    shareId: string,
    title: string,
    ticketCount: number
): Promise<boolean> {
    const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://fesmate.app";

    return shareToKakao({
        title,
        description: `${ticketCount}장의 티켓이 공유되었습니다`,
        url: `${baseUrl}/share/tickets/${shareId}`,
        buttonText: "티켓 갤러리 보기",
    });
}

/**
 * 연간 리포트를 카카오톡으로 공유
 */
export async function shareReportToKakao(
    year: number,
    totalEvents: number,
    topGenre?: string
): Promise<boolean> {
    const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://fesmate.app";

    return shareToKakao({
        title: `[FesMate] ${year}년 나의 공연 기록`,
        description: `올해 ${totalEvents}개의 공연을 다녀왔어요!${topGenre ? ` 최애 장르는 ${topGenre}` : ""}`,
        url: `${baseUrl}/myfes?tab=gonglog&year=${year}`,
        buttonText: "나도 기록하기",
    });
}

/**
 * 모바일에서 카카오톡 앱 스킴으로 이동 (SDK 없이)
 * @deprecated SDK 사용을 권장합니다
 */
export function openKakaoAppScheme(text: string): boolean {
    if (!/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        return false;
    }

    const encodedText = encodeURIComponent(text);

    // 안드로이드
    if (/Android/i.test(navigator.userAgent)) {
        window.location.href = `intent://send?text=${encodedText}#Intent;package=com.kakao.talk;scheme=kakaolink;end`;
        return true;
    }

    // iOS
    window.location.href = `kakaolink://send?text=${encodedText}`;
    return true;
}
