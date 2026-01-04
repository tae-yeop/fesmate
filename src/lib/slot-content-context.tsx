"use client";

/**
 * SlotContentContext
 *
 * 슬롯에 연결된 콘텐츠(리뷰/영상) 관리를 위한 Context
 * - 슬롯별 리뷰/영상 연결
 * - 콘텐츠 도움됨 관리
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from "react";
import { SlotContent, SlotReviewType } from "@/types/event";
import { createSharedAdapter } from "./storage";
import { DOMAINS } from "./storage/keys";
import { useAuth } from "./auth-context";
import { useDevContext } from "./dev-context";
import { extractYouTubeId } from "@/types/call-guide";

/** 슬롯 리뷰 타입 설정 */
export const SLOT_REVIEW_TYPE_CONFIG: Record<SlotReviewType, { label: string; icon: string; description: string }> = {
    review: {
        label: "리뷰",
        icon: "📝",
        description: "공연 후기 및 총평",
    },
    highlight: {
        label: "하이라이트",
        icon: "✨",
        description: "명장면, 베스트 모먼트",
    },
    fancam: {
        label: "직캠",
        icon: "📹",
        description: "팬이 촬영한 영상",
    },
};

interface SlotContentContextType {
    /** 슬롯 콘텐츠 목록 */
    slotContents: SlotContent[];
    /** 슬롯별 콘텐츠 조회 */
    getSlotContents: (slotId: string) => SlotContent[];
    /** 콘텐츠 추가 */
    addContent: (slotId: string, content: CreateSlotContentInput) => SlotContent | null;
    /** 콘텐츠 삭제 */
    deleteContent: (contentId: string) => boolean;
    /** 도움됨 토글 */
    toggleHelpful: (contentId: string) => void;
    /** 도움됨 여부 */
    isHelpful: (contentId: string) => boolean;
    /** 도움됨 카운트 */
    getHelpfulCount: (contentId: string, originalCount: number) => number;
    /** 로딩 완료 여부 */
    isLoaded: boolean;
}

interface CreateSlotContentInput {
    type: SlotReviewType;
    postId?: string;
    youtubeUrl?: string;
    title?: string;
}

const SlotContentContext = createContext<SlotContentContextType | undefined>(undefined);

// Storage adapter
const slotContentsAdapter = createSharedAdapter<SlotContent[]>({
    domain: DOMAINS.SLOT_CONTENTS,
    dateFields: ["createdAt"],
});

interface HelpfulData {
    items: string[];
    delta: Record<string, number>;
}
const helpfulAdapter = createSharedAdapter<HelpfulData>({
    domain: DOMAINS.SLOT_CONTENT_HELPFUL,
});

// UUID 생성 헬퍼
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function SlotContentProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();

    const [slotContents, setSlotContents] = useState<SlotContent[]>([]);
    const [helpfulItems, setHelpfulItems] = useState<Set<string>>(new Set());
    const [helpfulDelta, setHelpfulDelta] = useState<Map<string, number>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    const currentUserId = user?.id || mockUserId;

    // 초기 로드
    useEffect(() => {
        const stored = slotContentsAdapter.get();
        if (stored) setSlotContents(stored);

        const storedHelpful = helpfulAdapter.get();
        if (storedHelpful) {
            setHelpfulItems(new Set(storedHelpful.items || []));
            setHelpfulDelta(new Map(Object.entries(storedHelpful.delta || {})));
        }

        setIsLoaded(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoaded) return;

        slotContentsAdapter.set(slotContents);
        helpfulAdapter.set({
            items: Array.from(helpfulItems),
            delta: Object.fromEntries(helpfulDelta),
        });
    }, [slotContents, helpfulItems, helpfulDelta, isLoaded]);

    // 슬롯별 콘텐츠 조회
    const getSlotContents = useCallback(
        (slotId: string): SlotContent[] => {
            return slotContents
                .filter((c) => c.slotId === slotId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        [slotContents]
    );

    // 콘텐츠 추가
    const addContent = useCallback(
        (slotId: string, input: CreateSlotContentInput): SlotContent | null => {
            if (!currentUserId) return null;

            // YouTube ID 추출
            let youtubeId: string | undefined;
            let thumbnailUrl: string | undefined;
            if (input.youtubeUrl) {
                youtubeId = extractYouTubeId(input.youtubeUrl) || undefined;
                if (youtubeId) {
                    thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
                }
            }

            const newContent: SlotContent = {
                id: generateId(),
                slotId,
                type: input.type,
                postId: input.postId,
                youtubeUrl: input.youtubeUrl,
                youtubeId,
                title: input.title,
                thumbnailUrl,
                authorId: currentUserId,
                createdAt: new Date(),
                helpfulCount: 0,
            };

            setSlotContents((prev) => [...prev, newContent]);
            return newContent;
        },
        [currentUserId]
    );

    // 콘텐츠 삭제
    const deleteContent = useCallback(
        (contentId: string): boolean => {
            const content = slotContents.find((c) => c.id === contentId);
            if (!content) return false;

            // 작성자만 삭제 가능
            if (content.authorId !== currentUserId) return false;

            setSlotContents((prev) => prev.filter((c) => c.id !== contentId));
            return true;
        },
        [slotContents, currentUserId]
    );

    // 도움됨 토글
    const toggleHelpful = useCallback(
        (contentId: string) => {
            setHelpfulItems((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(contentId)) {
                    newSet.delete(contentId);
                } else {
                    newSet.add(contentId);
                }
                return newSet;
            });

            setHelpfulDelta((prev) => {
                const newMap = new Map(prev);
                const currentDelta = newMap.get(contentId) || 0;
                if (helpfulItems.has(contentId)) {
                    newMap.set(contentId, currentDelta - 1);
                } else {
                    newMap.set(contentId, currentDelta + 1);
                }
                return newMap;
            });
        },
        [helpfulItems]
    );

    const isHelpful = useCallback(
        (contentId: string) => helpfulItems.has(contentId),
        [helpfulItems]
    );

    const getHelpfulCount = useCallback(
        (contentId: string, originalCount: number) => {
            const delta = helpfulDelta.get(contentId) || 0;
            return Math.max(0, originalCount + delta);
        },
        [helpfulDelta]
    );

    const value = useMemo<SlotContentContextType>(
        () => ({
            slotContents,
            getSlotContents,
            addContent,
            deleteContent,
            toggleHelpful,
            isHelpful,
            getHelpfulCount,
            isLoaded,
        }),
        [
            slotContents,
            getSlotContents,
            addContent,
            deleteContent,
            toggleHelpful,
            isHelpful,
            getHelpfulCount,
            isLoaded,
        ]
    );

    return (
        <SlotContentContext.Provider value={value}>
            {children}
        </SlotContentContext.Provider>
    );
}

export function useSlotContent() {
    const context = useContext(SlotContentContext);
    if (context === undefined) {
        throw new Error("useSlotContent must be used within a SlotContentProvider");
    }
    return context;
}
