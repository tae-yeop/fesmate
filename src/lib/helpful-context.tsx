"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createSharedAdapter, DOMAINS } from "./storage";
import { useAuth } from "./auth-context";
import { useDevContext } from "./dev-context";
import { isValidUUID } from "./utils";
import {
    getUserReactions,
    toggleReaction,
} from "./supabase/queries/reactions";

// Storage 데이터 타입
interface HelpfulStorageData {
    posts: string[];
    delta: Record<string, number>;
}

// Storage adapter (전역 공유 - 비로그인 시 사용)
const helpfulAdapter = createSharedAdapter<HelpfulStorageData>({
    domain: DOMAINS.HELPFUL,
});

interface HelpfulContextType {
    // 내가 도움됨 표시한 포스트 ID 목록
    helpfulPosts: Set<string>;
    // 포스트별 도움됨 카운트 증분 (로컬 변경분만)
    helpfulDelta: Map<string, number>;
    // 도움됨 토글 (postUserId를 전달하여 자기 글 차단)
    toggleHelpful: (postId: string, postUserId?: string) => Promise<boolean>;
    // 도움됨 여부 확인
    isHelpful: (postId: string) => boolean;
    // 최종 도움됨 카운트 계산 (원래 카운트 + 내 증분)
    getHelpfulCount: (postId: string, originalCount: number) => number;
    // 자기 글인지 확인 (도움됨 버튼 비활성화용)
    isOwnPost: (postUserId: string) => boolean;
    // 로딩 상태
    loading: boolean;
}

const HelpfulContext = createContext<HelpfulContextType | undefined>(undefined);

export function HelpfulProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();
    const [helpfulPosts, setHelpfulPosts] = useState<Set<string>>(new Set());
    const [helpfulDelta, setHelpfulDelta] = useState<Map<string, number>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);

    // 현재 사용자 ID (실제 인증 또는 Dev 모드)
    const currentUserId = user?.id || mockUserId;

    // 데이터 로드 (localStorage 기본 + 로그인 시 Supabase 병합)
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 먼저 localStorage에서 로드 (Mock 데이터용)
                const localData = helpfulAdapter.get();
                console.log("[HelpfulContext] Loaded from storage:", localData?.posts?.length || 0, "posts");
                const localPosts = new Set<string>(localData?.posts || []);
                const localDelta = new Map<string, number>(Object.entries(localData?.delta || {}));

                if (user) {
                    // 로그인 시 Supabase에서도 로드하여 병합
                    try {
                        const dbReactions = await getUserReactions(user.id);
                        // DB 데이터와 로컬 데이터 병합
                        dbReactions.forEach(postId => localPosts.add(postId));
                    } catch (dbError) {
                        console.warn("[HelpfulContext] Supabase load failed, using local only:", dbError);
                    }
                }

                setHelpfulPosts(localPosts);
                setHelpfulDelta(localDelta);
            } catch (error) {
                console.error("[HelpfulContext] Load failed:", error);
            } finally {
                setIsLoaded(true);
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    // localStorage에 항상 저장 (Mock 데이터 유지용)
    useEffect(() => {
        if (!isLoaded) return;
        const data: HelpfulStorageData = {
            posts: Array.from(helpfulPosts),
            delta: Object.fromEntries(helpfulDelta),
        };
        console.log("[HelpfulContext] Saving to storage:", data.posts.length, "posts, delta:", Object.keys(data.delta).length);
        helpfulAdapter.set(data);
    }, [helpfulPosts, helpfulDelta, isLoaded]);

    // 자기 글인지 확인
    const isOwnPost = useCallback((postUserId: string): boolean => {
        if (!currentUserId) return false;
        return currentUserId === postUserId;
    }, [currentUserId]);

    const toggleHelpful = useCallback(async (postId: string, postUserId?: string): Promise<boolean> => {
        // 자기 글에는 도움됨 표시 불가
        if (postUserId && currentUserId && postUserId === currentUserId) {
            console.warn("[HelpfulContext] Cannot mark own post as helpful");
            return false;
        }

        const wasHelpful = helpfulPosts.has(postId);

        // Optimistic update
        setHelpfulPosts((prev) => {
            const newSet = new Set(prev);
            if (wasHelpful) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });

        // delta도 항상 업데이트 (로컬 카운트 반영용)
        setHelpfulDelta((prev) => {
            const newMap = new Map(prev);
            const currentDelta = newMap.get(postId) || 0;
            if (wasHelpful) {
                newMap.set(postId, currentDelta - 1);
            } else {
                newMap.set(postId, currentDelta + 1);
            }
            return newMap;
        });

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장 시도
        if (user && isValidUUID(postId)) {
            try {
                await toggleReaction(user.id, postId);
            } catch (error) {
                // Supabase 에러는 무시 (로컬 상태는 유지)
                console.warn("[HelpfulContext] Supabase sync failed:", error);
            }
        }

        return true;
    }, [helpfulPosts, user, currentUserId]);

    const isHelpful = useCallback((postId: string) => {
        return helpfulPosts.has(postId);
    }, [helpfulPosts]);

    const getHelpfulCount = useCallback((postId: string, originalCount: number) => {
        // 실제 UUID postId + 로그인 시에는 서버 값 그대로 사용 (트리거가 자동 업데이트)
        if (user && isValidUUID(postId)) {
            return originalCount;
        }
        // Mock 데이터이거나 비로그인 시에는 delta 적용
        const delta = helpfulDelta.get(postId) || 0;
        return Math.max(0, originalCount + delta);
    }, [helpfulDelta, user]);

    return (
        <HelpfulContext.Provider
            value={{
                helpfulPosts,
                helpfulDelta,
                toggleHelpful,
                isHelpful,
                getHelpfulCount,
                isOwnPost,
                loading,
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
