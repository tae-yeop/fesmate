/**
 * 지도 딥링크 유틸리티 - PRD 6.4.1
 * 지도 SDK/API 키 없이 외부 지도 앱(또는 웹)에서 검색/길찾기를 열 수 있게 함
 *
 * 참조: docs/tech/maps_deeplink.md
 */

import { createDeviceAdapter, DOMAINS } from "@/lib/storage";

/** 지원하는 지도 앱 타입 */
export type MapProvider = "google" | "kakao" | "naver" | "web";

/** 지도 앱 정보 */
export interface MapAppInfo {
    id: MapProvider;
    name: string;
    nameKo: string;
    description: string;
    recommended?: boolean;
}

/** 지도 앱 목록 */
export const MAP_APPS: MapAppInfo[] = [
    {
        id: "google",
        name: "Google Maps",
        nameKo: "구글지도",
        description: "앱/웹 자동 선택",
        recommended: true,
    },
    {
        id: "kakao",
        name: "KakaoMap",
        nameKo: "카카오맵",
        description: "앱 설치 시 앱으로 열림",
    },
    {
        id: "naver",
        name: "Naver Map",
        nameKo: "네이버지도",
        description: "앱 설치 필요",
    },
    {
        id: "web",
        name: "Web",
        nameKo: "웹으로 보기",
        description: "브라우저에서 열기",
    },
];

// Storage adapter for default map app (기기별 설정)
const defaultMapAppAdapter = createDeviceAdapter<MapProvider>({
    domain: DOMAINS.MAP_APP,
});

/**
 * 기본 지도 앱 설정 가져오기
 */
export function getDefaultMapApp(): MapProvider {
    const saved = defaultMapAppAdapter.get();
    if (saved && ["google", "kakao", "naver", "web"].includes(saved)) {
        return saved;
    }
    return "google";
}

/**
 * 기본 지도 앱 설정 저장
 */
export function setDefaultMapApp(provider: MapProvider): void {
    defaultMapAppAdapter.set(provider);
}

/**
 * 사용자가 기본 지도 앱을 설정했는지 확인
 */
export function hasDefaultMapApp(): boolean {
    return defaultMapAppAdapter.exists();
}

/**
 * 검색 쿼리 생성
 * placeHint가 있으면 합쳐서 검색 정확도 개선
 */
function buildSearchQuery(placeText: string, placeHint?: string): string {
    if (placeHint) {
        return `${placeText} ${placeHint}`;
    }
    return placeText;
}

/**
 * Google Maps URL 생성
 * Universal Maps URL: 앱이 있으면 앱으로, 없으면 브라우저로 열림
 */
function getGoogleMapsUrl(query: string): string {
    const encodedQuery = encodeURIComponent(query);
    return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

/**
 * KakaoMap URL 생성
 * 앱 스킴 사용 (설치 시 앱으로, 미설치 시 웹 폴백)
 */
function getKakaoMapUrl(query: string, useWebFallback = false): string {
    const encodedQuery = encodeURIComponent(query);

    if (useWebFallback) {
        // 웹 폴백 URL
        return `https://map.kakao.com/?q=${encodedQuery}`;
    }

    // 앱 스킴 (카카오맵 앱 설치 시)
    return `kakaomap://search?q=${encodedQuery}`;
}

/**
 * Naver Map URL 생성
 * 주의: 네이버지도는 앱 설치 필요
 */
function getNaverMapUrl(query: string, useWebFallback = false): string {
    const encodedQuery = encodeURIComponent(query);

    if (useWebFallback) {
        // 웹 폴백 URL (모바일 웹)
        return `https://m.map.naver.com/search2/search.naver?query=${encodedQuery}`;
    }

    // 앱 스킴 (네이버지도 앱 설치 시)
    return `nmap://search?query=${encodedQuery}&appname=com.fesmate`;
}

/**
 * 지도 앱 URL 생성
 */
export function getMapUrl(
    provider: MapProvider,
    placeText: string,
    placeHint?: string
): string {
    const query = buildSearchQuery(placeText, placeHint);

    switch (provider) {
        case "google":
            return getGoogleMapsUrl(query);
        case "kakao":
            // 웹에서는 웹 URL 사용 (앱 스킴 실패 시 UX 불안정)
            return getKakaoMapUrl(query, true);
        case "naver":
            // 웹에서는 웹 URL 사용
            return getNaverMapUrl(query, true);
        case "web":
        default:
            // 기본은 Google Maps 웹
            return getGoogleMapsUrl(query);
    }
}

/**
 * 지도 앱으로 열기
 * 새 탭/앱으로 이동
 */
export function openMap(
    provider: MapProvider,
    placeText: string,
    placeHint?: string
): void {
    const url = getMapUrl(provider, placeText, placeHint);
    window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * 기본 지도 앱으로 열기
 */
export function openMapWithDefault(
    placeText: string,
    placeHint?: string
): void {
    const defaultProvider = getDefaultMapApp();
    openMap(defaultProvider, placeText, placeHint);
}
