/**
 * Base Extractor
 *
 * 모든 Extractor의 기본 인터페이스와 유틸리티 함수
 */

import {
    SourceSite,
    RawEvent,
    ExtractorResult,
    ExtractConfidence,
    ExtractionMethod,
} from "@/types/crawl";
import { EventType } from "@/types/event";

/**
 * Extractor 인터페이스
 */
export interface Extractor {
    /** Extractor 이름 */
    name: string;
    /** 대상 소스 사이트 */
    site: SourceSite;
    /** URL을 처리할 수 있는지 확인 */
    canHandle(url: string): boolean;
    /** HTML에서 이벤트 정보 추출 */
    extract(html: string, url: string): Promise<ExtractorResult>;
}

/**
 * JSON-LD 이벤트 타입 (Schema.org)
 */
interface JsonLdEvent {
    "@type"?: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    location?: {
        "@type"?: string;
        name?: string;
        address?: string | { streetAddress?: string };
    };
    image?: string | string[] | { url?: string }[];
    performer?: { name?: string }[] | { name?: string };
    offers?: { price?: string; priceCurrency?: string; url?: string }[] | { price?: string; priceCurrency?: string; url?: string };
    description?: string;
}

// =============================================
// 공통 유틸리티 함수
// =============================================

/**
 * HTML에서 JSON-LD 스크립트 추출
 */
export function extractJsonLd(html: string): JsonLdEvent | null {
    try {
        // JSON-LD 스크립트 태그 찾기
        const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;

        while ((match = jsonLdPattern.exec(html)) !== null) {
            try {
                const jsonStr = match[1].trim();
                const data = JSON.parse(jsonStr);

                // 배열인 경우 Event 타입 찾기
                if (Array.isArray(data)) {
                    const event = data.find(
                        (item) =>
                            item["@type"] === "Event" ||
                            item["@type"] === "MusicEvent" ||
                            item["@type"] === "TheaterEvent" ||
                            item["@type"] === "Festival"
                    );
                    if (event) return event as JsonLdEvent;
                }

                // 단일 객체인 경우
                if (
                    data["@type"] === "Event" ||
                    data["@type"] === "MusicEvent" ||
                    data["@type"] === "TheaterEvent" ||
                    data["@type"] === "Festival"
                ) {
                    return data as JsonLdEvent;
                }

                // @graph 안에 있는 경우
                if (data["@graph"]) {
                    const event = data["@graph"].find(
                        (item: { "@type"?: string }) =>
                            item["@type"] === "Event" ||
                            item["@type"] === "MusicEvent" ||
                            item["@type"] === "TheaterEvent" ||
                            item["@type"] === "Festival"
                    );
                    if (event) return event as JsonLdEvent;
                }
            } catch {
                // JSON 파싱 실패, 다음 스크립트 시도
                continue;
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * HTML에서 메타 태그 추출
 */
export function extractMetaTags(html: string): Record<string, string> {
    const metas: Record<string, string> = {};

    // name 속성 메타 태그
    const namePattern = /<meta\s+name=["']([^"']+)["']\s+content=["']([^"']*)["']/gi;
    let match;

    while ((match = namePattern.exec(html)) !== null) {
        metas[match[1].toLowerCase()] = match[2];
    }

    // property 속성 메타 태그 (Open Graph)
    const propertyPattern = /<meta\s+property=["']([^"']+)["']\s+content=["']([^"']*)["']/gi;

    while ((match = propertyPattern.exec(html)) !== null) {
        metas[match[1].toLowerCase()] = match[2];
    }

    // content 먼저 오는 경우
    const contentFirstPattern = /<meta\s+content=["']([^"']*)["']\s+(?:name|property)=["']([^"']+)["']/gi;

    while ((match = contentFirstPattern.exec(html)) !== null) {
        metas[match[2].toLowerCase()] = match[1];
    }

    return metas;
}

/**
 * Open Graph 태그 추출
 */
export function extractOpenGraph(html: string): Record<string, string> {
    const metas = extractMetaTags(html);
    const og: Record<string, string> = {};

    for (const [key, value] of Object.entries(metas)) {
        if (key.startsWith("og:")) {
            og[key.substring(3)] = value;
        }
    }

    return og;
}

/**
 * HTML 타이틀 태그 추출
 */
export function extractTitle(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
        return cleanText(titleMatch[1]);
    }
    return undefined;
}

/**
 * 텍스트 정리 (HTML 엔티티 디코딩, 공백 정리)
 */
export function cleanText(text: string): string {
    return text
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * HTML 태그 제거
 */
export function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * DOM 셀렉터로 텍스트 추출 (간단한 CSS 셀렉터)
 *
 * 지원하는 셀렉터:
 * - 태그명: div, span, h1, etc.
 * - 클래스: .classname
 * - ID: #id
 * - 복합: div.classname, span#id
 */
export function querySelector(html: string, selector: string): string | undefined {
    try {
        // 클래스 셀렉터 처리
        if (selector.startsWith(".")) {
            const className = selector.substring(1);
            const pattern = new RegExp(
                `<[^>]+class=["'][^"']*\\b${escapeRegex(className)}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`,
                "i"
            );
            const match = html.match(pattern);
            if (match) {
                return cleanText(stripHtmlTags(match[1]));
            }
        }

        // ID 셀렉터 처리
        if (selector.startsWith("#")) {
            const id = selector.substring(1);
            const pattern = new RegExp(
                `<[^>]+id=["']${escapeRegex(id)}["'][^>]*>([\\s\\S]*?)<\\/`,
                "i"
            );
            const match = html.match(pattern);
            if (match) {
                return cleanText(stripHtmlTags(match[1]));
            }
        }

        // 태그.클래스 처리
        const tagClassMatch = selector.match(/^(\w+)\.(.+)$/);
        if (tagClassMatch) {
            const [, tag, className] = tagClassMatch;
            const pattern = new RegExp(
                `<${tag}[^>]+class=["'][^"']*\\b${escapeRegex(className)}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`,
                "i"
            );
            const match = html.match(pattern);
            if (match) {
                return cleanText(stripHtmlTags(match[1]));
            }
        }

        return undefined;
    } catch {
        return undefined;
    }
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 이미지 URL 추출
 */
export function extractImageUrls(html: string, baseUrl: string): string[] {
    const urls: string[] = [];

    // img 태그에서 src 추출
    const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;

    while ((match = imgPattern.exec(html)) !== null) {
        const url = resolveUrl(match[1], baseUrl);
        if (url && isImageUrl(url)) {
            urls.push(url);
        }
    }

    // Open Graph 이미지
    const og = extractOpenGraph(html);
    if (og.image) {
        const url = resolveUrl(og.image, baseUrl);
        if (url) {
            urls.unshift(url); // OG 이미지를 우선
        }
    }

    return [...new Set(urls)]; // 중복 제거
}

/**
 * 상대 URL을 절대 URL로 변환
 */
export function resolveUrl(url: string, baseUrl: string): string | undefined {
    try {
        if (url.startsWith("//")) {
            return "https:" + url;
        }
        if (url.startsWith("/") || !url.startsWith("http")) {
            return new URL(url, baseUrl).href;
        }
        return url;
    } catch {
        return undefined;
    }
}

/**
 * 이미지 URL인지 확인
 */
function isImageUrl(url: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * 제목에서 이벤트 타입 추론
 */
export function inferEventType(title: string, description?: string): EventType | undefined {
    const text = `${title} ${description || ""}`.toLowerCase();

    // 페스티벌
    if (
        text.includes("festival") ||
        text.includes("페스티벌") ||
        text.includes("페스타") ||
        text.includes("fest")
    ) {
        return "festival";
    }

    // 뮤지컬
    if (
        text.includes("musical") ||
        text.includes("뮤지컬") ||
        text.includes("오페라") ||
        text.includes("opera")
    ) {
        return "musical";
    }

    // 전시
    if (
        text.includes("exhibition") ||
        text.includes("전시") ||
        text.includes("아트쇼") ||
        text.includes("art show")
    ) {
        return "exhibition";
    }

    // 콘서트 (기본값)
    if (
        text.includes("concert") ||
        text.includes("콘서트") ||
        text.includes("공연") ||
        text.includes("라이브") ||
        text.includes("live") ||
        text.includes("투어") ||
        text.includes("tour")
    ) {
        return "concert";
    }

    return undefined;
}

/**
 * JSON-LD에서 RawEvent 생성
 */
export function jsonLdToRawEvent(
    jsonLd: JsonLdEvent,
    url: string,
    site: SourceSite
): RawEvent {
    const raw: RawEvent = {
        sourceSite: site,
        sourceUrl: url,
        fetchedAt: new Date(),
    };

    if (jsonLd.name) {
        raw.title = cleanText(jsonLd.name);
    }

    if (jsonLd.startDate) {
        raw.startAtRaw = jsonLd.startDate;
    }

    if (jsonLd.endDate) {
        raw.endAtRaw = jsonLd.endDate;
    }

    if (jsonLd.location) {
        if (typeof jsonLd.location.name === "string") {
            raw.venueText = cleanText(jsonLd.location.name);
        }
        if (jsonLd.location.address) {
            if (typeof jsonLd.location.address === "string") {
                raw.venueAddressText = cleanText(jsonLd.location.address);
            } else if (jsonLd.location.address.streetAddress) {
                raw.venueAddressText = cleanText(jsonLd.location.address.streetAddress);
            }
        }
    }

    // 이미지
    if (jsonLd.image) {
        if (typeof jsonLd.image === "string") {
            raw.posterUrls = [jsonLd.image];
        } else if (Array.isArray(jsonLd.image)) {
            raw.posterUrls = jsonLd.image.map((img) =>
                typeof img === "string" ? img : img.url || ""
            ).filter(Boolean);
        }
    }

    // 출연진
    if (jsonLd.performer) {
        if (Array.isArray(jsonLd.performer)) {
            raw.artistNames = jsonLd.performer.map((p) => p.name).filter(Boolean) as string[];
        } else if (jsonLd.performer.name) {
            raw.artistNames = [jsonLd.performer.name];
        }
    }

    // 가격
    if (jsonLd.offers) {
        const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers];
        const prices = offers
            .map((o) => {
                if (o.price) {
                    return `${o.price}${o.priceCurrency || "원"}`;
                }
                return null;
            })
            .filter(Boolean);
        if (prices.length > 0) {
            raw.priceText = prices.join(" / ");
        }

        // 예매 URL
        const ticketUrls = offers.map((o) => o.url).filter(Boolean) as string[];
        if (ticketUrls.length > 0) {
            raw.ticketingUrls = ticketUrls;
        }
    }

    if (jsonLd.description) {
        raw.description = cleanText(jsonLd.description);
    }

    // 이벤트 타입 추론
    raw.eventTypeHint = inferEventType(raw.title || "", raw.description);

    return raw;
}

/**
 * 성공 결과 생성
 */
export function createSuccessResult(
    rawEvent: RawEvent,
    confidence: ExtractConfidence,
    method: ExtractionMethod,
    warnings?: string[]
): ExtractorResult {
    return {
        success: true,
        rawEvent,
        confidence,
        extractionMethod: method,
        warnings,
    };
}

/**
 * 실패 결과 생성
 */
export function createErrorResult(error: string): ExtractorResult {
    return {
        success: false,
        confidence: "low",
        error,
    };
}
