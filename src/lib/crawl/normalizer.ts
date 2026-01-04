/**
 * Normalizer 모듈
 *
 * RawEvent를 CreateEventInput 형식으로 정규화
 * - 날짜/시간 파싱
 * - 장소 표준화
 * - 이벤트 타입 추론
 */

import { RawEvent, NormalizerResult, ExtractConfidence } from "@/types/crawl";
import { EventType, TicketLink } from "@/types/event";
import { CreateEventInput } from "@/types/event-registration";

/**
 * RawEvent를 CreateEventInput으로 정규화
 */
export function normalizeRawEvent(raw: RawEvent): NormalizerResult {
    const warnings: string[] = [];

    try {
        const prefillData: Partial<CreateEventInput> = {};

        // 제목
        if (raw.title) {
            prefillData.title = raw.title;
        } else {
            warnings.push("제목을 찾을 수 없습니다.");
        }

        // 시작 날짜/시간
        if (raw.startAtRaw) {
            const startAt = parseDate(raw.startAtRaw);
            if (startAt) {
                prefillData.startAt = startAt;
            } else {
                warnings.push(`시작 날짜를 파싱할 수 없습니다: ${raw.startAtRaw}`);
            }
        }

        // 종료 날짜/시간
        if (raw.endAtRaw) {
            const endAt = parseDate(raw.endAtRaw);
            if (endAt) {
                prefillData.endAt = endAt;
            } else {
                warnings.push(`종료 날짜를 파싱할 수 없습니다: ${raw.endAtRaw}`);
            }
        }

        // 장소
        if (raw.venueText) {
            const venue = parseVenue(raw.venueText, raw.venueAddressText);
            prefillData.venueName = venue.name;
            if (venue.address) {
                prefillData.venueAddress = venue.address;
            }
        }

        // 이벤트 타입
        prefillData.eventType = raw.eventTypeHint || inferEventType(raw.title || "");

        // 포스터 URL
        if (raw.posterUrls && raw.posterUrls.length > 0) {
            prefillData.posterUrl = raw.posterUrls[0];
        }

        // 가격
        if (raw.priceText) {
            prefillData.price = raw.priceText;
        }

        // 예매 링크
        prefillData.ticketLinks = createTicketLinks(raw);

        // 아티스트
        if (raw.artistNames && raw.artistNames.length > 0) {
            prefillData.artists = raw.artistNames;
        }

        // 설명
        if (raw.description) {
            prefillData.description = raw.description;
        }

        // 공식 URL
        prefillData.officialUrl = raw.sourceUrl;

        // 신뢰도 계산
        const confidence = calculateConfidence(prefillData, warnings);

        return {
            success: true,
            prefillData,
            originalUrl: raw.sourceUrl,
            sourceSite: raw.sourceSite,
            confidence,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    } catch (error) {
        return {
            success: false,
            originalUrl: raw.sourceUrl,
            sourceSite: raw.sourceSite,
            confidence: "low",
            error: error instanceof Error ? error.message : "정규화 중 오류가 발생했습니다.",
        };
    }
}

/**
 * 날짜 문자열 파싱
 *
 * 지원하는 형식:
 * - ISO 8601: "2025-01-15T19:00:00"
 * - 한국어: "2025년 1월 15일 19:00"
 * - 점 구분: "2025.01.15 19:00"
 * - 슬래시: "2025/01/15 19:00"
 * - 하이픈: "2025-01-15 19:00"
 */
export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const cleaned = dateStr.trim();

    // ISO 8601 형식
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(cleaned)) {
        const date = new Date(cleaned);
        if (!isNaN(date.getTime())) return date;
    }

    // 한국어 형식: "2025년 1월 15일 19:00", "2025년 1월 15일 오후 7시"
    const koreanPattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*(?:\([^)]+\))?)?\s*(?:(\d{1,2}):(\d{2})|(?:오전|오후)?\s*(\d{1,2})시)?/;
    const koreanMatch = cleaned.match(koreanPattern);
    if (koreanMatch) {
        const year = parseInt(koreanMatch[1]);
        const month = parseInt(koreanMatch[2]) - 1;
        const day = parseInt(koreanMatch[3]);
        let hour = 0;
        let minute = 0;

        if (koreanMatch[4] && koreanMatch[5]) {
            hour = parseInt(koreanMatch[4]);
            minute = parseInt(koreanMatch[5]);
        } else if (koreanMatch[6]) {
            hour = parseInt(koreanMatch[6]);
            if (cleaned.includes("오후") && hour < 12) {
                hour += 12;
            }
        }

        return new Date(year, month, day, hour, minute);
    }

    // 점/슬래시/하이픈 구분: "2025.01.15 19:00"
    const dotPattern = /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})(?:\s*(?:\([^)]+\))?)?\s*(?:(\d{1,2}):(\d{2}))?/;
    const dotMatch = cleaned.match(dotPattern);
    if (dotMatch) {
        const year = parseInt(dotMatch[1]);
        const month = parseInt(dotMatch[2]) - 1;
        const day = parseInt(dotMatch[3]);
        const hour = dotMatch[4] ? parseInt(dotMatch[4]) : 0;
        const minute = dotMatch[5] ? parseInt(dotMatch[5]) : 0;

        return new Date(year, month, day, hour, minute);
    }

    // 날짜만 (시간 없음)
    const dateOnlyPattern = /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/;
    const dateOnlyMatch = cleaned.match(dateOnlyPattern);
    if (dateOnlyMatch) {
        const year = parseInt(dateOnlyMatch[1]);
        const month = parseInt(dateOnlyMatch[2]) - 1;
        const day = parseInt(dateOnlyMatch[3]);

        return new Date(year, month, day);
    }

    return null;
}

/**
 * 장소 텍스트 파싱
 *
 * "올림픽공원 88잔디마당 (서울시 송파구...)" → { name: "올림픽공원 88잔디마당", address: "서울시 송파구..." }
 */
export function parseVenue(
    venueText: string,
    addressText?: string
): { name: string; address?: string } {
    const cleaned = venueText.trim();

    // 괄호 안에 주소가 있는 경우
    const parenMatch = cleaned.match(/^([^(]+)\s*\(([^)]+)\)/);
    if (parenMatch) {
        return {
            name: parenMatch[1].trim(),
            address: parenMatch[2].trim(),
        };
    }

    // 별도 주소 텍스트가 있는 경우
    if (addressText) {
        return {
            name: cleaned,
            address: addressText.trim(),
        };
    }

    // 장소명에 주소 패턴이 포함된 경우 분리
    const addressPattern = /(서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/;
    const addressMatch = cleaned.match(addressPattern);
    if (addressMatch && addressMatch.index && addressMatch.index > 3) {
        return {
            name: cleaned.substring(0, addressMatch.index).trim(),
            address: cleaned.substring(addressMatch.index).trim(),
        };
    }

    return { name: cleaned };
}

/**
 * 제목에서 이벤트 타입 추론
 */
export function inferEventType(title: string): EventType {
    const lowerTitle = title.toLowerCase();

    // 페스티벌
    if (
        lowerTitle.includes("festival") ||
        lowerTitle.includes("페스티벌") ||
        lowerTitle.includes("페스타") ||
        lowerTitle.includes("fest")
    ) {
        return "festival";
    }

    // 뮤지컬
    if (
        lowerTitle.includes("musical") ||
        lowerTitle.includes("뮤지컬") ||
        lowerTitle.includes("오페라")
    ) {
        return "musical";
    }

    // 전시
    if (
        lowerTitle.includes("exhibition") ||
        lowerTitle.includes("전시") ||
        lowerTitle.includes("아트쇼")
    ) {
        return "exhibition";
    }

    // 기본: 콘서트
    return "concert";
}

/**
 * 예매 링크 생성
 */
function createTicketLinks(raw: RawEvent): TicketLink[] {
    const links: TicketLink[] = [];

    // 소스 URL을 첫 번째 링크로
    const siteNames: Record<string, string> = {
        yes24: "YES24",
        interpark: "인터파크",
        melon: "멜론티켓",
        ticketlink: "티켓링크",
        official: "공식 사이트",
        unknown: "예매",
    };

    links.push({
        name: siteNames[raw.sourceSite] || "예매",
        url: raw.sourceUrl,
    });

    // 추가 예매 URL
    if (raw.ticketingUrls) {
        for (const url of raw.ticketingUrls) {
            if (url !== raw.sourceUrl) {
                links.push({
                    name: "예매",
                    url,
                });
            }
        }
    }

    return links;
}

/**
 * 신뢰도 계산
 */
function calculateConfidence(
    data: Partial<CreateEventInput>,
    warnings: string[]
): ExtractConfidence {
    let score = 0;

    if (data.title) score += 2;
    if (data.startAt) score += 2;
    if (data.venueName) score += 1;
    if (data.posterUrl) score += 1;
    if (data.price) score += 0.5;
    if (data.artists && data.artists.length > 0) score += 0.5;

    // 경고가 많으면 신뢰도 감소
    score -= warnings.length * 0.5;

    if (score >= 5) return "high";
    if (score >= 3) return "medium";
    return "low";
}
