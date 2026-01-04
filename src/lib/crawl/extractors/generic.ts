/**
 * Generic Extractor
 *
 * JSON-LD, OpenGraph, 메타 태그를 활용한 범용 추출기
 * 특정 사이트 Extractor가 없을 때 폴백으로 사용
 */

import { SourceSite, RawEvent, ExtractorResult } from "@/types/crawl";
import {
    Extractor,
    extractJsonLd,
    extractOpenGraph,
    extractMetaTags,
    extractTitle,
    extractImageUrls,
    jsonLdToRawEvent,
    cleanText,
    inferEventType,
    createSuccessResult,
    createErrorResult,
} from "./base";

/**
 * Generic Extractor
 *
 * 추출 우선순위:
 * 1. JSON-LD (Schema.org Event)
 * 2. OpenGraph 메타 태그
 * 3. 기본 메타 태그 + title
 */
export class GenericExtractor implements Extractor {
    name = "Generic";
    site: SourceSite = "unknown";

    canHandle(_url: string): boolean {
        // 모든 URL 처리 가능 (폴백)
        return true;
    }

    async extract(html: string, url: string): Promise<ExtractorResult> {
        const warnings: string[] = [];

        // 1. JSON-LD 시도 (가장 신뢰도 높음)
        const jsonLd = extractJsonLd(html);
        if (jsonLd) {
            const rawEvent = jsonLdToRawEvent(jsonLd, url, this.site);

            // 필수 필드 확인
            if (rawEvent.title) {
                return createSuccessResult(rawEvent, "high", "json-ld", warnings);
            }
            warnings.push("JSON-LD에서 제목을 찾을 수 없습니다.");
        }

        // 2. OpenGraph 메타 태그 시도
        const og = extractOpenGraph(html);
        if (og.title) {
            const rawEvent = this.ogToRawEvent(og, html, url);
            return createSuccessResult(rawEvent, "medium", "dom", warnings);
        }

        // 3. 기본 메타 태그 + title 태그 시도
        const metas = extractMetaTags(html);
        const title = extractTitle(html);

        if (title || metas.title) {
            const rawEvent = this.metaToRawEvent(metas, title, html, url);
            warnings.push("메타 태그에서 제한된 정보만 추출되었습니다.");
            return createSuccessResult(rawEvent, "low", "dom", warnings);
        }

        return createErrorResult("페이지에서 행사 정보를 찾을 수 없습니다.");
    }

    /**
     * OpenGraph 메타 태그에서 RawEvent 생성
     */
    private ogToRawEvent(
        og: Record<string, string>,
        html: string,
        url: string
    ): RawEvent {
        const raw: RawEvent = {
            sourceSite: this.site,
            sourceUrl: url,
            fetchedAt: new Date(),
        };

        if (og.title) {
            raw.title = cleanText(og.title);
        }

        if (og.description) {
            raw.description = cleanText(og.description);
        }

        if (og.image) {
            raw.posterUrls = [og.image];
        }

        // 추가 이미지 추출
        if (!raw.posterUrls || raw.posterUrls.length === 0) {
            raw.posterUrls = extractImageUrls(html, url).slice(0, 3);
        }

        // 이벤트 타입 추론
        raw.eventTypeHint = inferEventType(raw.title || "", raw.description);

        return raw;
    }

    /**
     * 기본 메타 태그에서 RawEvent 생성
     */
    private metaToRawEvent(
        metas: Record<string, string>,
        title: string | undefined,
        html: string,
        url: string
    ): RawEvent {
        const raw: RawEvent = {
            sourceSite: this.site,
            sourceUrl: url,
            fetchedAt: new Date(),
        };

        // 제목
        raw.title = title ? cleanText(title) : metas.title ? cleanText(metas.title) : undefined;

        // 설명
        if (metas.description) {
            raw.description = cleanText(metas.description);
        }

        // 이미지
        raw.posterUrls = extractImageUrls(html, url).slice(0, 3);

        // 이벤트 타입 추론
        raw.eventTypeHint = inferEventType(raw.title || "", raw.description);

        return raw;
    }
}

export const genericExtractor = new GenericExtractor();
