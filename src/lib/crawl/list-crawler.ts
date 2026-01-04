/**
 * 목록 페이지 크롤러
 *
 * 예매처의 카테고리/검색 결과 페이지에서 개별 행사 URL을 발견
 *
 * @see docs/tech/ingestion_crawling.md
 */

import {
    SourceSite,
    CrawlSource,
    ListCrawlerConfig,
    DiscoveredUrl,
    ListCrawlResult,
} from "@/types/crawl";
import { fetchUrl } from "./fetcher";

// =============================================
// 사이트별 목록 페이지 설정
// =============================================

interface SiteListConfig {
    baseUrl: string;
    categories: CategoryConfig[];
    defaultLinkPattern: RegExp;
}

interface CategoryConfig {
    name: string;
    path: string;
    linkPattern?: RegExp;
    maxPages?: number;
}

/** 사이트별 기본 설정 */
const SITE_LIST_CONFIGS: Partial<Record<SourceSite, SiteListConfig>> = {
    yes24: {
        baseUrl: "https://ticket.yes24.com",
        defaultLinkPattern: /\/Perf\/\d+/gi,
        categories: [
            {
                name: "콘서트",
                path: "/New/Genre/GenreList.aspx?genre=15456",
                maxPages: 5,
            },
            {
                name: "뮤지컬/연극",
                path: "/New/Genre/GenreList.aspx?genre=15457",
                maxPages: 3,
            },
            {
                name: "전시/행사",
                path: "/New/Genre/GenreList.aspx?genre=15459",
                maxPages: 3,
            },
            {
                name: "클래식/무용",
                path: "/New/Genre/GenreList.aspx?genre=15458",
                maxPages: 2,
            },
        ],
    },
    // 인터파크: CSR로 인해 서버 사이드 크롤링 제한
    // 멜론티켓: 추후 구현
    // 티켓링크: 추후 구현
};

// =============================================
// 목록 크롤러 함수
// =============================================

/**
 * 목록 소스에서 행사 URL 발견
 */
export async function crawlListSource(source: CrawlSource): Promise<ListCrawlResult> {
    const siteConfig = SITE_LIST_CONFIGS[source.sourceSite];

    if (!siteConfig) {
        return {
            success: false,
            source,
            discoveredUrls: [],
            newUrls: [],
            existingUrls: [],
            errors: [`${source.sourceSite}는 목록 크롤링을 지원하지 않습니다.`],
        };
    }

    const discoveredUrls: DiscoveredUrl[] = [];
    const errors: string[] = [];

    try {
        // 소스의 URL이 목록 페이지 URL인 경우
        const pageUrls = await generatePageUrls(source.url, source.listConfig);

        for (const pageUrl of pageUrls) {
            try {
                const result = await extractLinksFromPage(
                    pageUrl,
                    siteConfig.baseUrl,
                    source.listConfig?.linkPattern
                        ? new RegExp(source.listConfig.linkPattern, "gi")
                        : siteConfig.defaultLinkPattern,
                    source.sourceSite,
                    source.listConfig?.category
                );

                discoveredUrls.push(...result.urls);
                if (result.error) {
                    errors.push(result.error);
                }

                // Rate limiting: 사이트별 간격
                await delay(getRateLimitMs(source.sourceSite));
            } catch (error) {
                errors.push(`${pageUrl}: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
            }
        }

        // 중복 제거
        const uniqueUrls = deduplicateUrls(discoveredUrls);

        return {
            success: true,
            source,
            discoveredUrls: uniqueUrls,
            newUrls: uniqueUrls.map((u) => u.url), // TODO: DB 조회로 필터링
            existingUrls: [],
            errors,
        };
    } catch (error) {
        return {
            success: false,
            source,
            discoveredUrls: [],
            newUrls: [],
            existingUrls: [],
            errors: [error instanceof Error ? error.message : "알 수 없는 오류"],
        };
    }
}

/**
 * 전체 사이트 목록 크롤링
 */
export async function discoverAllEvents(): Promise<{
    totalDiscovered: number;
    bySite: Record<SourceSite, number>;
    errors: string[];
}> {
    const result = {
        totalDiscovered: 0,
        bySite: {} as Record<SourceSite, number>,
        errors: [] as string[],
    };

    for (const [site, config] of Object.entries(SITE_LIST_CONFIGS)) {
        if (!config) continue;

        const sourceSite = site as SourceSite;
        result.bySite[sourceSite] = 0;

        for (const category of config.categories) {
            try {
                const categoryUrl = `${config.baseUrl}${category.path}`;
                const pageUrls = await generatePageUrls(categoryUrl, {
                    maxPages: category.maxPages,
                });

                for (const pageUrl of pageUrls) {
                    const extracted = await extractLinksFromPage(
                        pageUrl,
                        config.baseUrl,
                        category.linkPattern || config.defaultLinkPattern,
                        sourceSite,
                        category.name
                    );

                    result.bySite[sourceSite] += extracted.urls.length;
                    result.totalDiscovered += extracted.urls.length;

                    if (extracted.error) {
                        result.errors.push(extracted.error);
                    }

                    await delay(getRateLimitMs(sourceSite));
                }
            } catch (error) {
                result.errors.push(
                    `[${site}/${category.name}] ${error instanceof Error ? error.message : "알 수 없는 오류"}`
                );
            }
        }
    }

    return result;
}

// =============================================
// 헬퍼 함수
// =============================================

/**
 * 페이지네이션 URL 생성
 */
async function generatePageUrls(
    baseUrl: string,
    config?: ListCrawlerConfig
): Promise<string[]> {
    const urls: string[] = [baseUrl];
    const maxPages = config?.maxPages || 1;

    if (maxPages <= 1) {
        return urls;
    }

    // YES24 페이지네이션 패턴
    if (baseUrl.includes("yes24.com")) {
        for (let page = 2; page <= maxPages; page++) {
            const separator = baseUrl.includes("?") ? "&" : "?";
            urls.push(`${baseUrl}${separator}page=${page}`);
        }
    }
    // 다른 사이트 패턴 추가 가능

    return urls;
}

/**
 * 페이지에서 링크 추출
 */
async function extractLinksFromPage(
    pageUrl: string,
    baseUrl: string,
    linkPattern: RegExp,
    sourceSite: SourceSite,
    category?: string
): Promise<{ urls: DiscoveredUrl[]; error?: string }> {
    const fetchResult = await fetchUrl(pageUrl);

    if (!fetchResult.success || !fetchResult.html) {
        return {
            urls: [],
            error: `${pageUrl}: ${fetchResult.error || "HTML을 가져올 수 없습니다."}`,
        };
    }

    const urls: DiscoveredUrl[] = [];
    const html = fetchResult.html;

    // href 속성에서 링크 추출
    const hrefPattern = /href=["']([^"']+)["']/gi;
    let match;

    while ((match = hrefPattern.exec(html)) !== null) {
        const href = match[1];

        // 패턴 매칭 (lastIndex 리셋 필요)
        const testPattern = new RegExp(linkPattern.source, linkPattern.flags);
        if (testPattern.test(href)) {
            const fullUrl = resolveUrl(href, baseUrl);
            if (fullUrl && !urls.some((u) => u.url === fullUrl)) {
                urls.push({
                    url: fullUrl,
                    sourceSite,
                    category,
                    discoveredAt: new Date(),
                });
            }
        }
    }

    return { urls };
}

/**
 * 상대 URL을 절대 URL로 변환
 */
function resolveUrl(href: string, baseUrl: string): string | null {
    try {
        // 이미 절대 URL인 경우
        if (href.startsWith("http://") || href.startsWith("https://")) {
            return href;
        }

        // 프로토콜 상대 URL
        if (href.startsWith("//")) {
            return `https:${href}`;
        }

        // 절대 경로
        if (href.startsWith("/")) {
            const base = new URL(baseUrl);
            return `${base.origin}${href}`;
        }

        // 상대 경로
        return new URL(href, baseUrl).href;
    } catch {
        return null;
    }
}

/**
 * URL 중복 제거
 */
function deduplicateUrls(urls: DiscoveredUrl[]): DiscoveredUrl[] {
    const seen = new Set<string>();
    return urls.filter((item) => {
        const normalized = normalizeUrl(item.url);
        if (seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });
}

/**
 * URL 정규화 (비교용)
 */
function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // 트래킹 파라미터 제거
        const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "ref", "fbclid"];
        trackingParams.forEach((param) => parsed.searchParams.delete(param));
        // 마지막 슬래시 제거
        return parsed.href.replace(/\/$/, "");
    } catch {
        return url;
    }
}

/**
 * 사이트별 Rate Limit (밀리초)
 */
function getRateLimitMs(site: SourceSite): number {
    const limits: Record<SourceSite, number> = {
        yes24: 2000,
        interpark: 3000,
        melon: 2000,
        ticketlink: 2000,
        official: 1000,
        unknown: 1000,
    };
    return limits[site] || 2000;
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================
// Export
// =============================================

export { SITE_LIST_CONFIGS, getRateLimitMs };
