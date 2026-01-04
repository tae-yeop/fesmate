/**
 * Detector 모듈
 *
 * URL에서 소스 사이트를 감지합니다
 */

import { SourceSite, SITE_PATTERNS } from "@/types/crawl";

/**
 * URL에서 소스 사이트를 감지합니다
 *
 * @param url 분석할 URL
 * @returns 감지된 소스 사이트
 */
export function detectSite(url: string): SourceSite {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // 우선순위 순서로 체크 (specific → generic)
        const siteOrder: SourceSite[] = [
            "yes24",
            "interpark",
            "melon",
            "ticketlink",
            "official",
            "unknown",
        ];

        for (const site of siteOrder) {
            if (SITE_PATTERNS[site].test(hostname) || SITE_PATTERNS[site].test(url)) {
                return site;
            }
        }

        return "unknown";
    } catch {
        return "unknown";
    }
}

/**
 * 지원되는 예매 사이트인지 확인합니다
 */
export function isSupportedTicketSite(url: string): boolean {
    const site = detectSite(url);
    return ["yes24", "interpark", "melon", "ticketlink"].includes(site);
}

/**
 * URL이 유효한 티켓 페이지인지 확인합니다 (패턴 기반)
 */
export function isValidTicketPage(url: string): { valid: boolean; reason?: string } {
    const site = detectSite(url);

    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();

        switch (site) {
            case "yes24":
                // YES24 티켓 상세 페이지: /Goods/Detail/Good/... 또는 /Perf/...
                if (pathname.includes("/goods/") || pathname.includes("/perf/")) {
                    return { valid: true };
                }
                return { valid: false, reason: "YES24 상품 상세 페이지 URL이 아닙니다." };

            case "interpark":
                // 인터파크: /goods/... 또는 /Ticket/...
                if (pathname.includes("/goods/") || pathname.includes("/ticket/")) {
                    return { valid: true };
                }
                return { valid: false, reason: "인터파크 상품 상세 페이지 URL이 아닙니다." };

            case "melon":
                // 멜론티켓: /performance/...
                if (pathname.includes("/performance/") || pathname.includes("/goods/")) {
                    return { valid: true };
                }
                return { valid: false, reason: "멜론티켓 상품 상세 페이지 URL이 아닙니다." };

            case "ticketlink":
                // 티켓링크: /product/...
                if (pathname.includes("/product/") || pathname.includes("/performance/")) {
                    return { valid: true };
                }
                return { valid: false, reason: "티켓링크 상품 상세 페이지 URL이 아닙니다." };

            case "official":
            case "unknown":
                // 기타 사이트는 일단 허용
                return { valid: true };

            default:
                return { valid: true };
        }
    } catch {
        return { valid: false, reason: "잘못된 URL 형식입니다." };
    }
}
