"use client";

import { useState, useEffect, useCallback } from "react";
import { ViewMode } from "./TicketViewToggle";

const STORAGE_KEY = "fesmate_ticketbook_view";

/**
 * 티켓북 뷰 모드 관리 훅
 * - localStorage에 설정 저장
 * - 기본값: landscape (가로로 긴 카드)
 */
export function useTicketView(defaultMode: ViewMode = "landscape") {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // localStorage에서 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ["portrait", "landscape", "auto"].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
    setIsLoaded(true);
  }, []);

  // 뷰 모드 변경 및 저장
  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return {
    viewMode,
    setViewMode: changeViewMode,
    isLoaded,
  };
}

/**
 * 이미지와 뷰 방향을 비교하여 회전 필요 여부 판단
 *
 * 핵심 원칙: 이미지의 긴 쪽이 뷰의 긴 방향에 맞춰져야 한다.
 *
 * | 이미지 비율 | 선택한 뷰 | 회전 | 결과 |
 * |------------|----------|------|------|
 * | 세로 (H > W) | 세로뷰 | ❌ | 이미지 그대로, 긴 쪽이 세로 |
 * | 세로 (H > W) | 가로뷰 | ✅ 90° | 회전하여 긴 쪽이 가로 |
 * | 가로 (W > H) | 세로뷰 | ✅ 90° | 회전하여 긴 쪽이 세로 |
 * | 가로 (W > H) | 가로뷰 | ❌ | 이미지 그대로, 긴 쪽이 가로 |
 * | 정사각형 | 세로뷰 | ❌ | 세로 카드에 맞춤 |
 * | 정사각형 | 가로뷰 | ❌ | 가로 카드에 맞춤 |
 */
export function needsRotation(
  imageWidth: number,
  imageHeight: number,
  viewMode: ViewMode
): boolean {
  // auto 모드에서는 회전하지 않음 (원본 비율 유지)
  if (viewMode === "auto") {
    return false;
  }

  // 정사각형 이미지는 회전 불필요
  if (Math.abs(imageWidth - imageHeight) < Math.min(imageWidth, imageHeight) * 0.1) {
    return false;
  }

  const isImageLandscape = imageWidth > imageHeight;
  const isViewLandscape = viewMode === "landscape";

  // 이미지 방향과 뷰 방향이 같으면 회전 필요 없음
  // 이미지 방향과 뷰 방향이 다르면 회전 필요
  //
  // 가로 이미지 + 가로뷰 = 회전 X (이미 맞음)
  // 가로 이미지 + 세로뷰 = 회전 O (가로를 세로로)
  // 세로 이미지 + 가로뷰 = 회전 O (세로를 가로로)
  // 세로 이미지 + 세로뷰 = 회전 X (이미 맞음)
  return isImageLandscape !== isViewLandscape;
}

/**
 * 이미지의 원본 방향 감지
 */
export function getImageOrientation(
  width: number,
  height: number
): "portrait" | "landscape" | "square" {
  const ratio = width / height;
  if (ratio > 1.1) return "landscape";
  if (ratio < 0.9) return "portrait";
  return "square";
}
