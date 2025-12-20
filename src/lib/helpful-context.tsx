"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface HelpfulContextType {
    // 내가 도움됨 표시한 포스트 ID 목록
    helpfulPosts: Set<string>;
    // 포스트별 도움됨 카운트 증분 (로컬 변경분만)
    helpfulDelta: Map<string, number>;
    // 도움됨 토글
    toggleHelpful: (postId: string) => void;
    // 도움됨 여부 확인
    isHelpful: (postId: string) => boolean;
    // 최종 도움됨 카운트 계산 (원래 카운트 + 내 증분)
    getHelpfulCount: (postId: string, originalCount: number) => number;
}

const HelpfulContext = createContext<HelpfulContextType | undefined>(undefined);

const STORAGE_KEY = "fesmate_helpful_posts";

export function HelpfulProvider({ children }: { children: React.ReactNode }) {
    const [helpfulPosts, setHelpfulPosts] = useState<Set<string>>(new Set());
    const [helpfulDelta, setHelpfulDelta] = useState<Map<string, number>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    // localStorage에서 로드
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                setHelpfulPosts(new Set(data.posts || []));
                setHelpfulDelta(new Map(Object.entries(data.delta || {})));
            }
        } catch (e) {
            console.error("Failed to load helpful state:", e);
        }
        setIsLoaded(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoaded) return;
        try {
            const data = {
                posts: Array.from(helpfulPosts),
                delta: Object.fromEntries(helpfulDelta),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save helpful state:", e);
        }
    }, [helpfulPosts, helpfulDelta, isLoaded]);

    const toggleHelpful = useCallback((postId: string) => {
        setHelpfulPosts((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });

        setHelpfulDelta((prev) => {
            const newMap = new Map(prev);
            const currentDelta = newMap.get(postId) || 0;
            if (helpfulPosts.has(postId)) {
                // 취소하면 delta 감소
                newMap.set(postId, currentDelta - 1);
            } else {
                // 추가하면 delta 증가
                newMap.set(postId, currentDelta + 1);
            }
            return newMap;
        });
    }, [helpfulPosts]);

    const isHelpful = useCallback((postId: string) => {
        return helpfulPosts.has(postId);
    }, [helpfulPosts]);

    const getHelpfulCount = useCallback((postId: string, originalCount: number) => {
        const delta = helpfulDelta.get(postId) || 0;
        return Math.max(0, originalCount + delta);
    }, [helpfulDelta]);

    return (
        <HelpfulContext.Provider
            value={{
                helpfulPosts,
                helpfulDelta,
                toggleHelpful,
                isHelpful,
                getHelpfulCount,
            }}
        >
            {children}
        </HelpfulContext.Provider>
    );
}

export function useHelpful() {
    const context = useContext(HelpfulContext);
    if (context === undefined) {
        throw new Error("useHelpful must be used within a HelpfulProvider");
    }
    return context;
}
