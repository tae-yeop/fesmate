/**
 * Fetcher 모듈
 *
 * URL에서 HTML을 가져오는 기능
 * - 타임아웃 처리
 * - User-Agent 설정
 * - 리다이렉트 추적
 * - Content-Type 검증
 */

import { FetchResult, FetchOptions } from "@/types/crawl";

const DEFAULT_TIMEOUT = 10000; // 10초
const DEFAULT_USER_AGENT = "FesMate/1.0 (Event Aggregator; +https://fesmate.com)";

/**
 * URL에서 HTML을 가져옵니다
 */
export async function fetchUrl(
    url: string,
    options?: FetchOptions
): Promise<FetchResult> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;

    try {
        // URL 유효성 검사
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return {
                success: false,
                url,
                error: "지원하지 않는 프로토콜입니다. HTTP 또는 HTTPS만 지원합니다.",
            };
        }

        // AbortController로 타임아웃 처리
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                signal: controller.signal,
                redirect: "follow",
            });

            clearTimeout(timeoutId);

            const statusCode = response.status;
            const contentType = response.headers.get("content-type") || "";
            const finalUrl = response.url;

            // HTTP 에러 체크
            if (!response.ok) {
                return {
                    success: false,
                    url: finalUrl,
                    statusCode,
                    contentType,
                    error: `HTTP 오류: ${statusCode} ${response.statusText}`,
                };
            }

            // Content-Type 체크 (HTML만 처리)
            if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
                return {
                    success: false,
                    url: finalUrl,
                    statusCode,
                    contentType,
                    error: `지원하지 않는 콘텐츠 타입입니다: ${contentType}`,
                };
            }

            // HTML 가져오기
            const html = await response.text();

            // 빈 응답 체크
            if (!html || html.trim().length === 0) {
                return {
                    success: false,
                    url: finalUrl,
                    statusCode,
                    contentType,
                    error: "빈 응답을 받았습니다.",
                };
            }

            return {
                success: true,
                html,
                url: finalUrl,
                statusCode,
                contentType,
            };
        } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError instanceof Error) {
                if (fetchError.name === "AbortError") {
                    return {
                        success: false,
                        url,
                        error: `요청 시간이 초과되었습니다 (${timeout / 1000}초).`,
                    };
                }
                return {
                    success: false,
                    url,
                    error: `네트워크 오류: ${fetchError.message}`,
                };
            }

            throw fetchError;
        }
    } catch (error) {
        if (error instanceof TypeError && error.message.includes("Invalid URL")) {
            return {
                success: false,
                url,
                error: "잘못된 URL 형식입니다.",
            };
        }

        return {
            success: false,
            url,
            error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        };
    }
}

/**
 * URL이 유효한지 확인합니다
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ["http:", "https:"].includes(parsed.protocol);
    } catch {
        return false;
    }
}
