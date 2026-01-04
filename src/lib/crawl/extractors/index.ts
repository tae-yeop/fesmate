/**
 * Extractor Registry
 *
 * 모든 Extractor를 등록하고 URL에 맞는 Extractor를 반환
 */

import { SourceSite } from "@/types/crawl";
import { Extractor } from "./base";
import { yes24Extractor } from "./yes24";
import { interparkExtractor } from "./interpark";
import { genericExtractor } from "./generic";

/**
 * 등록된 Extractor 목록 (우선순위 순서)
 */
const extractors: Extractor[] = [
    yes24Extractor,
    interparkExtractor,
    // 추후 추가: melonExtractor, ticketlinkExtractor
    genericExtractor, // 폴백 (항상 마지막)
];

/**
 * URL에 맞는 Extractor 반환
 */
export function getExtractor(url: string): Extractor {
    for (const extractor of extractors) {
        if (extractor.canHandle(url)) {
            return extractor;
        }
    }
    return genericExtractor;
}

/**
 * 소스 사이트에 맞는 Extractor 반환
 */
export function getExtractorBySite(site: SourceSite): Extractor {
    for (const extractor of extractors) {
        if (extractor.site === site) {
            return extractor;
        }
    }
    return genericExtractor;
}

/**
 * 모든 Extractor 목록 반환
 */
export function getAllExtractors(): Extractor[] {
    return [...extractors];
}

/**
 * 지원되는 사이트 목록 반환
 */
export function getSupportedSites(): SourceSite[] {
    return extractors
        .filter((e) => e.site !== "unknown")
        .map((e) => e.site);
}

// Re-exports
export type { Extractor } from "./base";
export { yes24Extractor } from "./yes24";
export { interparkExtractor } from "./interpark";
export { genericExtractor } from "./generic";
