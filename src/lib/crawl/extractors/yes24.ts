/**
 * YES24 Extractor
 *
 * YES24 티켓 페이지에서 행사 정보 추출
 * https://ticket.yes24.com/
 */

import { SourceSite, RawEvent, ExtractorResult } from "@/types/crawl";
import {
    Extractor,
    extractJsonLd,
    jsonLdToRawEvent,
    cleanText,
    stripHtmlTags,
    extractImageUrls,
    resolveUrl,
    inferEventType,
    createSuccessResult,
    createErrorResult,
} from "./base";

/**
 * YES24 Extractor
 *
 * 추출 우선순위:
 * 1. JSON-LD (있는 경우)
 * 2. DOM 파싱 (CSS 셀렉터 기반)
 */
export class Yes24Extractor implements Extractor {
    name = "YES24";
    site: SourceSite = "yes24";

    canHandle(url: string): boolean {
        return /ticket\.yes24\.com/i.test(url);
    }

    async extract(html: string, url: string): Promise<ExtractorResult> {
        const warnings: string[] = [];

        // 1. JSON-LD 시도
        const jsonLd = extractJsonLd(html);
        if (jsonLd && jsonLd.name) {
            const rawEvent = jsonLdToRawEvent(jsonLd, url, this.site);
            return createSuccessResult(rawEvent, "high", "json-ld", warnings);
        }

        // 2. DOM 파싱
        try {
            const rawEvent = this.extractFromDom(html, url);

            if (!rawEvent.title) {
                return createErrorResult("페이지에서 공연 제목을 찾을 수 없습니다.");
            }

            // 신뢰도 결정
            const confidence = this.calculateConfidence(rawEvent);

            return createSuccessResult(rawEvent, confidence, "dom", warnings);
        } catch (error) {
            return createErrorResult(
                `DOM 파싱 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
            );
        }
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

        // 관람 등급
        raw.ageRestriction = this.extractAgeRestriction(html);

        // 이벤트 타입 추론
        raw.eventTypeHint = inferEventType(raw.title || "", raw.description);

        return raw;
    }

    /**
     * 제목 추출
     */
    private extractTitle(html: string): string | undefined {
        // 패턴 1: rn-big-title 클래스
        const pattern1 = /<[^>]+class="[^"]*rn-big-title[^"]*"[^>]*>([^<]+)<\/h2>/i;
        const match1 = html.match(pattern1);
        if (match1) return cleanText(match1[1]);

        // 패턴 2: prf_title 클래스
        const pattern2 = /<[^>]+class="[^"]*prf_title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
        const match2 = html.match(pattern2);
        if (match2) return cleanText(stripHtmlTags(match2[1]));

        // 패턴 3: h2.title
        const pattern3 = /<h2[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i;
        const match3 = html.match(pattern3);
        if (match3) return cleanText(stripHtmlTags(match3[1]));

        // 패턴 4: og:title
        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch) return cleanText(ogTitleMatch[1]);

        return undefined;
    }

    /**
     * 날짜 추출
     */
    private extractDates(html: string): { start?: string; end?: string } {
        // 패턴 1: rn-product-area1 내 날짜
        const datePattern1 = /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})\s*(?:\([^)]+\))?\s*(?:~|-)?\s*(?:(\d{4})[.\-\/])?(\d{1,2})?[.\-\/]?(\d{1,2})?/;

        // 공연 기간 영역 찾기
        const periodSection = html.match(/(?:공연기간|기간|일시)[^<]*<[^>]*>([^<]+)/i);
        if (periodSection) {
            const dateMatch = periodSection[1].match(datePattern1);
            if (dateMatch) {
                const startDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
                let endDate: string | undefined;

                if (dateMatch[5] && dateMatch[6]) {
                    const endYear = dateMatch[4] || dateMatch[1];
                    endDate = `${endYear}-${dateMatch[5].padStart(2, "0")}-${dateMatch[6].padStart(2, "0")}`;
                }

                return { start: startDate, end: endDate };
            }
        }

        // 패턴 2: 일반 날짜 패턴
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
        // 패턴 1: 공연장 정보 영역
        const venuePattern1 = /(?:공연장|장소|공연\s*장소)[^<]*<[^>]*>([^<]+)/i;
        const match1 = html.match(venuePattern1);
        if (match1) return cleanText(match1[1]);

        // 패턴 2: rn-product-area1 내 장소
        const venuePattern2 = /<span[^>]*class="[^"]*rn-place[^"]*"[^>]*>([^<]+)<\/span>/i;
        const match2 = html.match(venuePattern2);
        if (match2) return cleanText(match2[1]);

        // 패턴 3: venue 클래스
        const venuePattern3 = /<[^>]+class="[^"]*venue[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
        const match3 = html.match(venuePattern3);
        if (match3) return cleanText(stripHtmlTags(match3[1]));

        return undefined;
    }

    /**
     * 가격 추출
     */
    private extractPrice(html: string): string | undefined {
        // 가격 정보 영역 찾기
        const priceSection = html.match(/(?:가격|티켓\s*가격|좌석\s*가격)[^<]*<[^>]*>([\s\S]*?)(?:<\/(?:div|td|li)>)/i);
        if (priceSection) {
            const prices: string[] = [];
            const pricePattern = /([A-Z가-힣]+)\s*(?:석|좌석)?\s*[:\s]*([0-9,]+)\s*원/g;
            let match;
            while ((match = pricePattern.exec(priceSection[1])) !== null) {
                prices.push(`${match[1]} ${match[2]}원`);
            }
            if (prices.length > 0) {
                return prices.join(" / ");
            }
        }

        // 일반 가격 패턴
        const generalPrice = html.match(/([0-9,]+)\s*원/);
        if (generalPrice) {
            return `${generalPrice[1]}원`;
        }

        return undefined;
    }

    /**
     * 포스터 이미지 추출
     */
    private extractPoster(html: string, baseUrl: string): string[] {
        const posters: string[] = [];

        // 패턴 1: poster 영역
        const posterPattern = /<[^>]+(?:id|class)="[^"]*poster[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i;
        const match1 = html.match(posterPattern);
        if (match1) {
            const url = resolveUrl(match1[1], baseUrl);
            if (url) posters.push(url);
        }

        // 패턴 2: rn-big-image
        const bigImagePattern = /<[^>]+class="[^"]*rn-big-image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i;
        const match2 = html.match(bigImagePattern);
        if (match2) {
            const url = resolveUrl(match2[1], baseUrl);
            if (url) posters.push(url);
        }

        // 패턴 3: og:image
        const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImage) {
            posters.push(ogImage[1]);
        }

        // 중복 제거 후 일반 이미지 추가
        if (posters.length === 0) {
            const allImages = extractImageUrls(html, baseUrl);
            posters.push(...allImages.slice(0, 3));
        }

        return [...new Set(posters)];
    }

    /**
     * 출연진 추출
     */
    private extractArtists(html: string): string[] | undefined {
        const artists: string[] = [];

        // 패턴 1: 출연 정보 영역
        const castSection = html.match(/(?:출연|캐스팅|출연진|아티스트)[^<]*<[^>]*>([\s\S]*?)(?:<\/(?:div|ul|td)>)/i);
        if (castSection) {
            // 콤마나 줄바꿈으로 구분된 이름들
            const names = stripHtmlTags(castSection[1])
                .split(/[,،、\n]/)
                .map((name) => cleanText(name))
                .filter((name) => name.length > 0 && name.length < 50);
            artists.push(...names);
        }

        return artists.length > 0 ? [...new Set(artists)] : undefined;
    }

    /**
     * 관람 등급 추출
     */
    private extractAgeRestriction(html: string): string | undefined {
        const agePattern = /(?:관람등급|관람\s*가|연령)[^<]*<[^>]*>([^<]+)/i;
        const match = html.match(agePattern);
        if (match) {
            return cleanText(match[1]);
        }

        // 숫자+세 패턴
        const ageNumPattern = /(\d+)\s*세\s*(?:이상|미만)/;
        const numMatch = html.match(ageNumPattern);
        if (numMatch) {
            return numMatch[0];
        }

        return undefined;
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

export const yes24Extractor = new Yes24Extractor();
