/**
 * SNS oEmbed 유틸리티
 * Instagram, Twitter 포스트 URL을 임베드 가능한 HTML로 변환
 */

import type { OEmbedData, ParsedSocialUrl, SocialPlatform } from "@/types/gallery";

/** Instagram URL 패턴 */
const INSTAGRAM_PATTERNS = [
    /^https?:\/\/(?:www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /^https?:\/\/(?:www\.)?instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /^https?:\/\/(?:www\.)?instagr\.am\/p\/([A-Za-z0-9_-]+)/,
];

/** Twitter/X URL 패턴 */
const TWITTER_PATTERNS = [
    /^https?:\/\/(?:www\.)?twitter\.com\/(\w+)\/status\/(\d+)/,
    /^https?:\/\/(?:www\.)?x\.com\/(\w+)\/status\/(\d+)/,
    /^https?:\/\/(?:mobile\.)?twitter\.com\/(\w+)\/status\/(\d+)/,
];

/**
 * URL에서 플랫폼 감지
 */
export function detectPlatform(url: string): SocialPlatform | null {
    const trimmedUrl = url.trim();

    for (const pattern of INSTAGRAM_PATTERNS) {
        if (pattern.test(trimmedUrl)) {
            return "instagram";
        }
    }

    for (const pattern of TWITTER_PATTERNS) {
        if (pattern.test(trimmedUrl)) {
            return "twitter";
        }
    }

    return null;
}

/**
 * SNS URL 파싱
 */
export function parseSocialUrl(url: string): ParsedSocialUrl | null {
    const trimmedUrl = url.trim();
    const platform = detectPlatform(trimmedUrl);

    if (!platform) {
        return null;
    }

    if (platform === "instagram") {
        for (const pattern of INSTAGRAM_PATTERNS) {
            const match = trimmedUrl.match(pattern);
            if (match) {
                return {
                    platform,
                    url: trimmedUrl,
                    postId: match[1],
                };
            }
        }
    }

    if (platform === "twitter") {
        for (const pattern of TWITTER_PATTERNS) {
            const match = trimmedUrl.match(pattern);
            if (match) {
                return {
                    platform,
                    url: trimmedUrl,
                    username: match[1],
                    postId: match[2],
                };
            }
        }
    }

    return null;
}

/**
 * Instagram oEmbed API 호출
 * @see https://developers.facebook.com/docs/instagram/oembed
 */
export async function getInstagramEmbed(url: string): Promise<OEmbedData | null> {
    try {
        // Instagram oEmbed API는 서버 사이드에서 호출해야 함 (CORS)
        // 클라이언트에서는 API Route를 통해 호출
        const response = await fetch(`/api/oembed/instagram?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            console.error("[oEmbed] Instagram API error:", response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("[oEmbed] Instagram fetch error:", error);
        return null;
    }
}

/**
 * Twitter oEmbed API 호출
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/oembed-api
 */
export async function getTwitterEmbed(url: string): Promise<OEmbedData | null> {
    try {
        // Twitter/X oEmbed API (공개 API, CORS 허용)
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
        const response = await fetch(oembedUrl);

        if (!response.ok) {
            console.error("[oEmbed] Twitter API error:", response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("[oEmbed] Twitter fetch error:", error);
        return null;
    }
}

/**
 * 플랫폼에 따라 적절한 oEmbed 호출
 */
export async function getEmbed(url: string): Promise<OEmbedData | null> {
    const parsed = parseSocialUrl(url);

    if (!parsed) {
        return null;
    }

    if (parsed.platform === "instagram") {
        return getInstagramEmbed(url);
    }

    if (parsed.platform === "twitter") {
        return getTwitterEmbed(url);
    }

    return null;
}

/**
 * Instagram 임베드 HTML 생성 (oEmbed 없이 직접 생성)
 * Note: Instagram은 oEmbed API에 Access Token이 필요하므로 대안으로 사용
 */
export function generateInstagramEmbedHtml(url: string): string {
    const parsed = parseSocialUrl(url);
    if (!parsed || parsed.platform !== "instagram") {
        return "";
    }

    // Instagram 기본 임베드 iframe
    return `
        <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
            <a href="${url}" target="_blank">Instagram에서 보기</a>
        </blockquote>
    `;
}

/**
 * Twitter 임베드 HTML 생성 (oEmbed 없이 직접 생성)
 */
export function generateTwitterEmbedHtml(url: string): string {
    const parsed = parseSocialUrl(url);
    if (!parsed || parsed.platform !== "twitter") {
        return "";
    }

    // Twitter 기본 임베드
    return `
        <blockquote class="twitter-tweet">
            <a href="${url}">트윗 보기</a>
        </blockquote>
    `;
}

/**
 * 임베드 스크립트 로드 (클라이언트)
 */
export function loadEmbedScripts(): void {
    // Instagram 임베드 스크립트
    if (!document.querySelector('script[src*="instagram.com/embed"]')) {
        const igScript = document.createElement("script");
        igScript.src = "//www.instagram.com/embed.js";
        igScript.async = true;
        document.body.appendChild(igScript);
    }

    // Twitter 임베드 스크립트
    if (!document.querySelector('script[src*="platform.twitter.com"]')) {
        const twScript = document.createElement("script");
        twScript.src = "https://platform.twitter.com/widgets.js";
        twScript.async = true;
        document.body.appendChild(twScript);
    }
}

/**
 * 임베드 위젯 새로고침 (동적 로드 후 호출)
 */
export function refreshEmbeds(): void {
    // Instagram
    if (typeof window !== "undefined" && (window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm) {
        (window as unknown as { instgrm: { Embeds: { process: () => void } } }).instgrm.Embeds.process();
    }

    // Twitter
    if (typeof window !== "undefined" && (window as unknown as { twttr?: { widgets: { load: () => void } } }).twttr) {
        (window as unknown as { twttr: { widgets: { load: () => void } } }).twttr.widgets.load();
    }
}

/**
 * URL 유효성 검사
 */
export function isValidSocialUrl(url: string): boolean {
    return detectPlatform(url) !== null;
}

/**
 * 플랫폼 이름 반환
 */
export function getPlatformName(platform: SocialPlatform): string {
    switch (platform) {
        case "instagram":
            return "Instagram";
        case "twitter":
            return "Twitter/X";
        default:
            return "Unknown";
    }
}

/**
 * 플랫폼 아이콘 색상 반환
 */
export function getPlatformColor(platform: SocialPlatform): string {
    switch (platform) {
        case "instagram":
            return "#E4405F";
        case "twitter":
            return "#1DA1F2";
        default:
            return "#666666";
    }
}
