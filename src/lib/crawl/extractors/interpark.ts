/**
 * Interpark Extractor
 *
 * 인터파크 티켓 페이지에서 행사 정보 추출
 * https://tickets.interpark.com/
 */

import { SourceSite, RawEvent, ExtractorResult } from "@/types/crawl";
import {
    Extractor,
    extractJsonLd,
    jsonLdToRawEvent,
    cleanText,
    stripHtmlTags,
    resolveUrl,
    inferEventType,
    createSuccessResult,
    createErrorResult,
} from "./base";

/**
 * Interpark Extractor
 *
 * 추출 우선순위:
 * 1. JSON-LD (있는 경우)
 * 2. __NEXT_DATA__ (Next.js 기반 페이지)
 * 3. DOM 파싱 (CSS 셀렉터 기반)
 */
export class InterparkExtractor implements Extractor {
    name = "Interpark";
    site: SourceSite = "interpark";

    canHandle(url: string): boolean {
        return /tickets\.interpark\.com|ticketinter\.com/i.test(url);
    }

    async extract(html: string, url: string): Promise<ExtractorResult> {
        const warnings: string[] = [];

        // 0. CSR 페이지 감지 (인터파크는 JavaScript로 렌더링됨)
        // HTML이 매우 짧거나 title이 기본값인 경우 CSR로 판단
        if (this.isClientSideRendered(html)) {
            return createErrorResult(
                "인터파크는 현재 자동 추출을 지원하지 않습니다. 정보를 직접 입력해주세요."
            );
        }

        // 1. JSON-LD 시도
        const jsonLd = extractJsonLd(html);
        if (jsonLd && jsonLd.name) {
            const rawEvent = jsonLdToRawEvent(jsonLd, url, this.site);
            return createSuccessResult(rawEvent, "high", "json-ld", warnings);
        }

        // 2. __NEXT_DATA__ 시도 (Next.js 기반)
        const nextData = this.extractNextData(html);
        if (nextData) {
            const rawEvent = this.nextDataToRawEvent(nextData, url);
            if (rawEvent.title) {
                return createSuccessResult(rawEvent, "high", "embedded-json", warnings);
            }
        }

        // 3. DOM 파싱
        try {
            const rawEvent = this.extractFromDom(html, url);

            if (!rawEvent.title) {
                return createErrorResult(
                    "인터파크는 현재 자동 추출을 지원하지 않습니다. 정보를 직접 입력해주세요."
                );
            }

            const confidence = this.calculateConfidence(rawEvent);
            return createSuccessResult(rawEvent, confidence, "dom", warnings);
        } catch (error) {
            return createErrorResult(
                `DOM 파싱 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
            );
        }
    }

    /**
     * 클라이언트 사이드 렌더링 페이지인지 확인
     * 인터파크는 JavaScript로 모든 콘텐츠를 렌더링함
     */
    private isClientSideRendered(html: string): boolean {
        // HTML이 매우 짧은 경우 (실제 콘텐츠 없음)
        if (html.length < 5000) {
            return true;
        }

        // title 태그가 "NOL 티켓"만 있는 경우 (기본값, 실제 콘텐츠 미로드)
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1].trim() === "NOL 티켓") {
            return true;
        }

        // og:title 메타 태그가 없는 경우
        const hasOgTitle = /<meta[^>]+property=["']og:title["']/i.test(html) ||
                           /<meta[^>]+content=["'][^"']+["'][^>]+property=["']og:title["']/i.test(html);
        if (!hasOgTitle) {
            return true;
        }

        return false;
    }

    /**
     * __NEXT_DATA__ 추출
     */
    private extractNextData(html: string): Record<string, unknown> | null {
        try {
            const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
            if (nextDataMatch) {
                const data = JSON.parse(nextDataMatch[1]);
                return data?.props?.pageProps || data;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * __NEXT_DATA__에서 RawEvent 생성
     */
    private nextDataToRawEvent(data: Record<string, unknown>, url: string): RawEvent {
        const raw: RawEvent = {
            sourceSite: this.site,
            sourceUrl: url,
            fetchedAt: new Date(),
        };

        // 상품 정보 찾기 (다양한 경로 시도)
        const product = this.findProductData(data);

        if (product) {
            if (typeof product.goodsName === "string") {
                raw.title = cleanText(product.goodsName);
            } else if (typeof product.name === "string") {
                raw.title = cleanText(product.name);
            }

            if (typeof product.playStartDate === "string") {
                raw.startAtRaw = product.playStartDate;
            } else if (typeof product.startDate === "string") {
                raw.startAtRaw = product.startDate;
            }

            if (typeof product.playEndDate === "string") {
                raw.endAtRaw = product.playEndDate;
            } else if (typeof product.endDate === "string") {
                raw.endAtRaw = product.endDate;
            }

            if (typeof product.placeName === "string") {
                raw.venueText = cleanText(product.placeName);
            } else if (typeof product.venue === "string") {
                raw.venueText = cleanText(product.venue);
            }

            if (typeof product.posterUrl === "string") {
                raw.posterUrls = [product.posterUrl];
            } else if (typeof product.image === "string") {
                raw.posterUrls = [product.image];
            }

            // 출연진
            if (Array.isArray(product.casting)) {
                raw.artistNames = product.casting
                    .map((c: { name?: string }) => c.name)
                    .filter(Boolean) as string[];
            }
        }

        raw.eventTypeHint = inferEventType(raw.title || "", raw.description);

        return raw;
    }

    /**
     * NEXT_DATA에서 상품 데이터 찾기
     */
    private findProductData(
        data: Record<string, unknown>
    ): Record<string, unknown> | null {
        // 직접 접근 시도
        if (data.goods) return data.goods as Record<string, unknown>;
        if (data.product) return data.product as Record<string, unknown>;
        if (data.goodsInfo) return data.goodsInfo as Record<string, unknown>;

        // 중첩된 데이터 탐색
        for (const key of Object.keys(data)) {
            const value = data[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
                const nested = value as Record<string, unknown>;
                if (nested.goodsName || nested.name || nested.title) {
                    return nested;
                }
            }
        }

        return null;
    }

    /**
     * DOM에서 정보 추출
     */
    private extractFromDom(html: string, url: string): RawEvent {
        const raw: RawEvent = {
            sourceSite: this.site,
            sourceUrl: url,
            fetchedAt: new Date(),
        };

        // 제목 추출
        raw.title = this.extractTitle(html);

        // 날짜 추출
        const dates = this.extractDates(html);
        raw.startAtRaw = dates.start;
        raw.endAtRaw = dates.end;

        // 장소 추출
        raw.venueText = this.extractVenue(html);

        // 가격 추출
        raw.priceText = this.extractPrice(html);

        // 포스터 이미지 추출
        raw.posterUrls = this.extractPoster(html, url);

        // 출연진 추출
        raw.artistNames = this.extractArtists(html);

        // 이벤트 타입 추론
        raw.eventTypeHint = inferEventType(raw.title || "", raw.description);

        return raw;
    }

    /**
     * 제목 추출
     */
    private extractTitle(html: string): string | undefined {
        // 패턴 1: prdTitle 클래스
        const pattern1 = /<[^>]+class="[^"]*prdTitle[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
        const match1 = html.match(pattern1);
        if (match1) return cleanText(stripHtmlTags(match1[1]));

        // 패턴 2: prd_title
        const pattern2 = /<[^>]+class="[^"]*prd_title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
        const match2 = html.match(pattern2);
        if (match2) return cleanText(stripHtmlTags(match2[1]));

        // 패턴 3: h1 태그
        const pattern3 = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
        const match3 = html.match(pattern3);
        if (match3) return cleanText(stripHtmlTags(match3[1]));

        // 패턴 4: og:title
        const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitle) return cleanText(ogTitle[1]);

        return undefined;
    }

    /**
     * 날짜 추출
     */
    private extractDates(html: string): { start?: string; end?: string } {
        // 공연 기간 영역
        const periodPattern = /(?:공연기간|기간)[^<]*<[^>]*>([\s\S]*?)(?:<\/(?:dd|span|div)>)/i;
        const periodMatch = html.match(periodPattern);

        if (periodMatch) {
            const dateText = stripHtmlTags(periodMatch[1]);
            const datePattern = /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/g;
            const dates: string[] = [];
            let match;

            while ((match = datePattern.exec(dateText)) !== null) {
                dates.push(`${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`);
            }

            return {
                start: dates[0],
                end: dates[1],
            };
        }

        // 일반 날짜 패턴
        const generalDateMatch = html.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
        if (generalDateMatch) {
            return {
                start: `${generalDateMatch[1]}-${generalDateMatch[2]}-${generalDateMatch[3]}`,
            };
        }

        return {};
    }

    /**
     * 장소 추출
     */
    private extractVenue(html: string): string | undefined {
        // 패턴 1: infoPlace 클래스
        const pattern1 = /<[^>]+class="[^"]*infoPlace[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
        const match1 = html.match(pattern1);
        if (match1) return cleanText(stripHtmlTags(match1[1]));

        // 패턴 2: 공연장 정보
        const pattern2 = /(?:공연장|장소)[^<]*<[^>]*>([\s\S]*?)(?:<\/(?:dd|span|div)>)/i;
        const match2 = html.match(pattern2);
        if (match2) return cleanText(stripHtmlTags(match2[1]));

        return undefined;
    }

    /**
     * 가격 추출
     */
    private extractPrice(html: string): string | undefined {
        // 가격 정보 영역
        const pricePattern = /<[^>]+class="[^"]*infoPrice[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
        const priceMatch = html.match(pricePattern);

        if (priceMatch) {
            const priceText = stripHtmlTags(priceMatch[1]);
            const prices: string[] = [];
            const priceItemPattern = /([A-Z가-힣]+)\s*(?:석)?\s*[:\s]*([0-9,]+)\s*원/g;
            let match;

            while ((match = priceItemPattern.exec(priceText)) !== null) {
                prices.push(`${match[1]} ${match[2]}원`);
            }

            if (prices.length > 0) {
                return prices.join(" / ");
            }

            // 단일 가격
            const singlePrice = priceText.match(/([0-9,]+)\s*원/);
            if (singlePrice) {
                return `${singlePrice[1]}원`;
            }
        }

        return undefined;
    }

    /**
     * 포스터 이미지 추출
     */
    private extractPoster(html: string, baseUrl: string): string[] {
        const posters: string[] = [];

        // 패턴 1: posterBoxImage
        const pattern1 = /<[^>]+class="[^"]*posterBoxImage[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i;
        const match1 = html.match(pattern1);
        if (match1) {
            const url = resolveUrl(match1[1], baseUrl);
            if (url) posters.push(url);
        }

        // 패턴 2: prdPoster
        const pattern2 = /<[^>]+class="[^"]*prdPoster[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i;
        const match2 = html.match(pattern2);
        if (match2) {
            const url = resolveUrl(match2[1], baseUrl);
            if (url) posters.push(url);
        }

        // 패턴 3: og:image
        const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImage) {
            posters.push(ogImage[1]);
        }

        return [...new Set(posters)];
    }

    /**
     * 출연진 추출
     */
    private extractArtists(html: string): string[] | undefined {
        const artists: string[] = [];

        // 출연진 영역
        const castPattern = /(?:출연|캐스팅)[^<]*<[^>]*>([\s\S]*?)(?:<\/(?:dd|div|ul)>)/i;
        const castMatch = html.match(castPattern);

        if (castMatch) {
            const names = stripHtmlTags(castMatch[1])
                .split(/[,،、\n]/)
                .map((name) => cleanText(name))
                .filter((name) => name.length > 0 && name.length < 50);
            artists.push(...names);
        }

        return artists.length > 0 ? [...new Set(artists)] : undefined;
    }

    /**
     * 신뢰도 계산
     */
    private calculateConfidence(raw: RawEvent): "high" | "medium" | "low" {
        let score = 0;

        if (raw.title) score += 2;
        if (raw.startAtRaw) score += 2;
        if (raw.venueText) score += 1;
        if (raw.priceText) score += 1;
        if (raw.posterUrls && raw.posterUrls.length > 0) score += 1;

        if (score >= 5) return "high";
        if (score >= 3) return "medium";
        return "low";
    }
}

export const interparkExtractor = new InterparkExtractor();
