"use client";

/**
 * PostContext
 *
 * 글(Post) 관리를 위한 Context
 * - 실제 로그인 사용자: Supabase DB 사용
 * - Dev 모드/비로그인: localStorage + Mock 데이터 사용
 *
 * Supabase 연동 완료:
 * - CRUD 작업: dataMode === "supabase"일 때 DB 사용
 * - 신고 기능: reports 테이블과 연동 (submitReport)
 * - 숨김 처리: reports 테이블의 신고 수 카운트로 판단
 */

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
    type ReactNode,
} from "react";

import { useAuth } from "./auth-context";
import { useDevContext } from "./dev-context";
import { useBlock } from "./block-context";
import { isValidUUID } from "./utils";
import { MOCK_POSTS } from "./mock-data";
import type { Post, PostType, PostStatus } from "@/types/post";

import {
    getPostsByEvent as getPostsByEventFromDb,
    getPostsByUser as getPostsByUserFromDb,
    getCommunityPosts as getCommunityPostsFromDb,
    getAllCommunityPosts as getAllCommunityPostsFromDb,
    getPost as getPostFromDb,
    getHubFeed as getHubFeedFromDb,
    createPost as createPostInDb,
    updatePost as updatePostInDb,
    deletePost as deletePostInDb,
    updatePostStatus as updatePostStatusInDb,
    bumpPost as bumpPostInDb,
    incrementCurrentPeople as incrementCurrentPeopleInDb,
    decrementCurrentPeople as decrementCurrentPeopleInDb,
    submitReport as submitReportToDb,
    type CreatePostInput,
    type UpdatePostInput,
} from "./supabase/queries";
import { createClient } from "./supabase/client";
import { createSharedAdapter } from "./storage";
import { DOMAINS } from "./storage/keys";

// ===== Helper Functions =====

/**
 * Supabase에서 특정 글의 신고 수 조회
 * reports 테이블에서 target_type='post' AND target_id={postId} 카운트
 */
async function getReportCountFromDb(postId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("target_type", "post")
        .eq("target_id", postId);

    if (error) {
        console.error("[getReportCountFromDb] Error:", error);
        return 0;
    }

    return count || 0;
}

// ===== Types =====

/** 신고 누적으로 자동 숨김 처리되는 임계값 */
export const REPORT_THRESHOLD_HIDE = 3;

interface PostContextValue {
    // 데이터
    posts: Post[];
    isLoading: boolean;
    isFromSupabase: boolean;

    // 조회
    getPostById: (postId: string) => Post | undefined;
    getPostsByEvent: (eventId: string) => Post[];
    getPostsByUser: (userId: string) => Post[];
    getCommunityPosts: (category?: string, eventId?: string) => Post[];
    getHubFeed: (eventId: string, types?: PostType[]) => Post[];

    // 생성/수정/삭제
    createPost: (input: CreatePostInput) => Promise<Post | null>;
    updatePost: (postId: string, input: UpdatePostInput) => Promise<boolean>;
    deletePost: (postId: string) => Promise<boolean>;

    // 상태 변경
    updatePostStatus: (postId: string, status: PostStatus) => Promise<boolean>;
    bumpPost: (postId: string) => Promise<boolean>;

    // 참여 인원
    incrementCurrentPeople: (postId: string) => Promise<boolean>;
    decrementCurrentPeople: (postId: string) => Promise<boolean>;

    // 데이터 새로고침
    refreshPosts: () => Promise<void>;

    // 신고 관련
    /** 글에 신고 접수 (Supabase: reports 테이블에 저장) */
    reportPost: (postId: string, reason?: string, detail?: string) => Promise<boolean>;
    /** 글의 신고 수 조회 */
    getReportCount: (postId: string) => Promise<number>;
    /** 숨김 글인지 확인 (신고 임계값 기준) */
    isPostHidden: (postId: string) => boolean;
    /** 숨김 글 목록 조회 (자기 글만) */
    getHiddenPosts: () => Post[];
}

const COMMUNITY_TYPES: PostType[] = [
    "companion",
    "taxi",
    "meal",
    "lodge",
    "transfer",
    "tip",
    "question",
    "fanevent",
    "afterparty",
];

// ===== Context =====

const PostContext = createContext<PostContextValue | undefined>(undefined);

// ===== Provider =====

// localStorage 어댑터 (Mock 모드에서 사용자가 작성한 글 저장)
const userPostsAdapter = createSharedAdapter<Post[]>({
    domain: DOMAINS.USER_POSTS,
    dateFields: ["createdAt", "updatedAt", "meetAt", "departAt", "checkinAt", "expiresAt"],
});

export function PostProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { mockUserId, dataMode, isHydrated: isDevHydrated } = useDevContext();
    const { isBlocked } = useBlock();

    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    // 현재 사용자 ID (실제 인증 또는 Dev 모드)
    const currentUserId = user?.id || mockUserId;
    // dataMode로 데이터 소스 결정 (mock/supabase)
    const useSupabase = dataMode === "supabase";

    // Mock 모드: localStorage에서 사용자 작성 글 로드
    const loadPostsFromLocalStorage = useCallback(() => {
        const savedPosts = userPostsAdapter.get() || [];
        console.log("[PostContext] Loading from localStorage:", savedPosts.length, "user posts");

        // 사용자 작성 글이 먼저 오도록 병합 (최신순)
        const savedIds = new Set(savedPosts.map(p => p.id));
        const mockOnlyPosts = MOCK_POSTS.filter(p => !savedIds.has(p.id));

        // 사용자 글 (최신) + Mock 글 순서
        const allPosts = [...savedPosts, ...mockOnlyPosts];
        // 생성일 기준 정렬 (최신순)
        allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setPosts(allPosts);
        setIsFromSupabase(false);
        setIsLoading(false);
    }, []);

    // Supabase에서 글 로드
    const loadPostsFromSupabase = useCallback(async () => {
        setIsLoading(true);
        try {
            // 커뮤니티 글 전체 로드
            const communityPosts = await getAllCommunityPostsFromDb(COMMUNITY_TYPES, {
                limit: 100,
            });

            if (communityPosts.length > 0) {
                setPosts(communityPosts);
                setIsFromSupabase(true);
            } else {
                // Supabase에 데이터가 없으면 빈 배열
                setPosts([]);
                setIsFromSupabase(true);
            }
        } catch (error) {
            console.error("[PostContext] Failed to load posts from Supabase:", error);
            // 에러 시 빈 배열 (Mock 데이터와 혼용하지 않음)
            setPosts([]);
            setIsFromSupabase(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 초기 로드 - DevContext hydration 완료 후 dataMode에 따라 분기
    useEffect(() => {
        console.log("[PostContext] useEffect triggered - isDevHydrated:", isDevHydrated, "dataMode:", dataMode, "useSupabase:", useSupabase, "currentUserId:", currentUserId);

        // DevContext가 localStorage에서 설정을 로드할 때까지 대기
        if (!isDevHydrated) {
            console.log("[PostContext] Waiting for DevContext hydration...");
            return;
        }

        console.log("[PostContext] DevContext hydrated, loading posts...");
        if (useSupabase) {
            loadPostsFromSupabase();
        } else {
            loadPostsFromLocalStorage();
        }
    }, [isDevHydrated, dataMode, useSupabase, loadPostsFromSupabase, loadPostsFromLocalStorage, currentUserId]);

    // 새로고침
    const refreshPosts = useCallback(async () => {
        if (useSupabase) {
            await loadPostsFromSupabase();
        } else {
            loadPostsFromLocalStorage();
        }
    }, [useSupabase, loadPostsFromSupabase, loadPostsFromLocalStorage]);

    // 차단된 사용자 및 숨김 글 필터링
    // (자기 글은 숨김 상태여도 볼 수 있음)
    const filterBlockedAndHiddenPosts = useCallback(
        (postList: Post[]): Post[] => {
            return postList.filter(p => {
                // 차단된 사용자의 글은 필터링
                if (isBlocked(p.userId)) return false;
                // 숨김 글은 필터링 (단, 자기 글은 예외)
                if (p.isHidden && p.userId !== currentUserId) return false;
                return true;
            });
        },
        [isBlocked, currentUserId]
    );

    // 글 ID로 조회
    const getPostById = useCallback(
        (postId: string): Post | undefined => {
            const post = posts.find(p => p.id === postId);
            // 단일 조회는 차단 필터링 없이 반환 (상세 페이지 접근 가능)
            return post;
        },
        [posts]
    );

    // 이벤트별 글 조회
    const getPostsByEvent = useCallback(
        (eventId: string): Post[] => {
            const filtered = posts.filter(p => p.eventId === eventId);
            return filterBlockedAndHiddenPosts(filtered);
        },
        [posts, filterBlockedAndHiddenPosts]
    );

    // 사용자별 글 조회
    const getPostsByUser = useCallback(
        (userId: string): Post[] => {
            // 사용자별 조회는 차단 필터링 없이 반환 (프로필 페이지용)
            return posts.filter(p => p.userId === userId);
        },
        [posts]
    );

    // 커뮤니티 글 조회
    const getCommunityPosts = useCallback(
        (category?: string, eventId?: string): Post[] => {
            let filtered = posts.filter(p => COMMUNITY_TYPES.includes(p.type as PostType));

            if (category && category !== "all") {
                filtered = filtered.filter(p => p.type === category);
            }

            if (eventId && eventId !== "all") {
                filtered = filtered.filter(p => p.eventId === eventId);
            }

            // 차단된 사용자 및 숨김 글 필터링
            return filterBlockedAndHiddenPosts(filtered);
        },
        [posts, filterBlockedAndHiddenPosts]
    );

    // 허브 피드 조회
    const getHubFeed = useCallback(
        (eventId: string, types?: PostType[]): Post[] => {
            const hubTypes = types || ["gate", "md", "facility", "safety"];
            const filtered = posts
                .filter(p => p.eventId === eventId && hubTypes.includes(p.type as PostType))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // 차단된 사용자 및 숨김 글 필터링
            return filterBlockedAndHiddenPosts(filtered);
        },
        [posts, filterBlockedAndHiddenPosts]
    );

    // 글 생성
    const createPost = useCallback(
        async (input: CreatePostInput): Promise<Post | null> => {
            if (!currentUserId) return null;

            if (useSupabase) {
                // Supabase 모드에서는 UUID 형식의 user ID가 필요
                if (!isValidUUID(currentUserId)) {
                    console.error("[PostContext] Supabase mode requires a valid UUID user. Please login with Google OAuth.");
                    alert("Supabase 모드에서는 Google 로그인이 필요합니다. Mock 사용자로는 글을 작성할 수 없습니다.");
                    return null;
                }
                try {
                    const newPost = await createPostInDb(currentUserId, input);
                    setPosts(prev => [newPost, ...prev]);
                    return newPost;
                } catch (error) {
                    console.error("[PostContext] Failed to create post:", error);
                    return null;
                }
            } else {
                // Mock 모드: 로컬 상태 + localStorage에 추가
                const newPost: Post = {
                    id: `post-${Date.now()}`,
                    userId: currentUserId,
                    eventId: input.eventId,
                    type: input.type,
                    status: "ACTIVE",
                    content: input.content,
                    helpfulCount: 0,
                    currentPeople: 1,
                    maxPeople: input.maxPeople,
                    meetAt: input.meetAt,
                    departAt: input.departAt,
                    checkinAt: input.checkinAt,
                    placeText: input.placeText,
                    placeHint: input.placeHint,
                    expiresAt: input.expiresAt,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                setPosts(prev => {
                    const updated = [newPost, ...prev];
                    // localStorage에 사용자 작성 글만 저장 (MOCK_POSTS 제외)
                    const mockIds = new Set(MOCK_POSTS.map(p => p.id));
                    const userPosts = updated.filter(p => !mockIds.has(p.id));
                    console.log("[PostContext] Saving to localStorage:", userPosts.length, "user posts");
                    userPostsAdapter.set(userPosts);
                    return updated;
                });
                return newPost;
            }
        },
        [currentUserId, useSupabase]
    );

    // 글 수정
    const updatePost = useCallback(
        async (postId: string, input: UpdatePostInput): Promise<boolean> => {
            if (useSupabase && isValidUUID(postId)) {
                try {
                    const updated = await updatePostInDb(postId, input);
                    setPosts(prev =>
                        prev.map(p => (p.id === postId ? updated : p))
                    );
                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to update post:", error);
                    return false;
                }
            } else {
                // Mock 모드 - null을 undefined로 변환 + localStorage 저장
                setPosts(prev => {
                    const updated = prev.map(p => {
                        if (p.id !== postId) return p;
                        return {
                            ...p,
                            ...(input.content !== undefined && { content: input.content }),
                            ...(input.status !== undefined && { status: input.status }),
                            ...(input.meetAt !== undefined && { meetAt: input.meetAt ?? undefined }),
                            ...(input.departAt !== undefined && { departAt: input.departAt ?? undefined }),
                            ...(input.checkinAt !== undefined && { checkinAt: input.checkinAt ?? undefined }),
                            ...(input.maxPeople !== undefined && { maxPeople: input.maxPeople }),
                            ...(input.budget !== undefined && { budget: input.budget }),
                            ...(input.price !== undefined && { price: input.price }),
                            ...(input.rules !== undefined && { rules: input.rules }),
                            ...(input.contactMethod !== undefined && { contactMethod: input.contactMethod }),
                            ...(input.placeText !== undefined && { placeText: input.placeText }),
                            ...(input.placeHint !== undefined && { placeHint: input.placeHint }),
                            ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt ?? undefined }),
                            ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
                            ...(input.isUrgent !== undefined && { isUrgent: input.isUrgent }),
                            updatedAt: new Date(),
                        };
                    });
                    // localStorage 업데이트
                    const mockIds = new Set(MOCK_POSTS.map(p => p.id));
                    const userPosts = updated.filter(p => !mockIds.has(p.id));
                    userPostsAdapter.set(userPosts);
                    return updated;
                });
                return true;
            }
        },
        [useSupabase]
    );

    // 글 삭제
    const deletePost = useCallback(
        async (postId: string): Promise<boolean> => {
            if (useSupabase && isValidUUID(postId)) {
                try {
                    await deletePostInDb(postId);
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to delete post:", error);
                    return false;
                }
            } else {
                // Mock 모드 + localStorage 업데이트
                setPosts(prev => {
                    const updated = prev.filter(p => p.id !== postId);
                    const mockIds = new Set(MOCK_POSTS.map(p => p.id));
                    const userPosts = updated.filter(p => !mockIds.has(p.id));
                    userPostsAdapter.set(userPosts);
                    return updated;
                });
                return true;
            }
        },
        [useSupabase]
    );

    // 상태 변경
    const updatePostStatus = useCallback(
        async (postId: string, status: PostStatus): Promise<boolean> => {
            if (useSupabase && isValidUUID(postId)) {
                try {
                    await updatePostStatusInDb(postId, status);
                    setPosts(prev =>
                        prev.map(p =>
                            p.id === postId ? { ...p, status, updatedAt: new Date() } : p
                        )
                    );
                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to update post status:", error);
                    return false;
                }
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p.id === postId ? { ...p, status, updatedAt: new Date() } : p
                    )
                );
                return true;
            }
        },
        [useSupabase]
    );

    // 끌어올리기
    const bumpPost = useCallback(
        async (postId: string): Promise<boolean> => {
            if (useSupabase && isValidUUID(postId)) {
                try {
                    const updated = await bumpPostInDb(postId);
                    setPosts(prev =>
                        prev.map(p => (p.id === postId ? updated : p))
                    );
                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to bump post:", error);
                    return false;
                }
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p.id === postId
                            ? { ...p, lastBumpedAt: new Date(), updatedAt: new Date() }
                            : p
                    )
                );
                return true;
            }
        },
        [useSupabase]
    );

    // 참여 인원 증가
    const incrementCurrentPeople = useCallback(
        async (postId: string): Promise<boolean> => {
            if (useSupabase && isValidUUID(postId)) {
                try {
                    await incrementCurrentPeopleInDb(postId);
                    setPosts(prev =>
                        prev.map(p =>
                            p.id === postId
                                ? { ...p, currentPeople: (p.currentPeople || 1) + 1 }
                                : p
                        )
                    );
                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to increment people:", error);
                    return false;
                }
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p.id === postId
                            ? { ...p, currentPeople: (p.currentPeople || 1) + 1 }
                            : p
                    )
                );
                return true;
            }
        },
        [useSupabase]
    );

    // 참여 인원 감소
    const decrementCurrentPeople = useCallback(
        async (postId: string): Promise<boolean> => {
            if (useSupabase && isValidUUID(postId)) {
                try {
                    await decrementCurrentPeopleInDb(postId);
                    setPosts(prev =>
                        prev.map(p =>
                            p.id === postId
                                ? { ...p, currentPeople: Math.max(1, (p.currentPeople || 1) - 1) }
                                : p
                        )
                    );
                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to decrement people:", error);
                    return false;
                }
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p.id === postId
                            ? { ...p, currentPeople: Math.max(1, (p.currentPeople || 1) - 1) }
                            : p
                    )
                );
                return true;
            }
        },
        [useSupabase]
    );

    // 글 신고 접수 (Supabase: reports 테이블에 저장, Mock: 로컬 상태 업데이트)
    const reportPost = useCallback(
        async (postId: string, reason: string = "other", detail?: string): Promise<boolean> => {
            if (!currentUserId) {
                console.error("[PostContext] Cannot report: no current user");
                return false;
            }

            const post = posts.find(p => p.id === postId);
            if (!post) {
                console.error("[PostContext] Cannot report: post not found");
                return false;
            }

            if (useSupabase && isValidUUID(postId) && isValidUUID(currentUserId)) {
                // Supabase 모드: reports 테이블에 신고 저장
                try {
                    await submitReportToDb({
                        reporterId: currentUserId,
                        targetType: "post",
                        targetId: postId,
                        targetUserId: post.userId,
                        reason: reason as "spam" | "scam" | "abuse" | "hate" | "harassment" | "privacy" | "illegal" | "other",
                        detail,
                    });
                    console.log(`[PostContext] Post ${postId} reported to Supabase`);

                    // 신고 수 조회하여 숨김 여부 업데이트
                    const reportCount = await getReportCountFromDb(postId);
                    const shouldHide = reportCount >= REPORT_THRESHOLD_HIDE;

                    if (shouldHide) {
                        setPosts(prev =>
                            prev.map(p =>
                                p.id === postId
                                    ? { ...p, reportCount, isHidden: true, hiddenAt: new Date() }
                                    : p
                            )
                        );
                    }

                    return true;
                } catch (error) {
                    console.error("[PostContext] Failed to report post:", error);
                    return false;
                }
            } else {
                // Mock 모드: 로컬 상태만 업데이트
                setPosts(prev =>
                    prev.map(p => {
                        if (p.id !== postId) return p;

                        const newReportCount = (p.reportCount || 0) + 1;
                        const shouldHide = newReportCount >= REPORT_THRESHOLD_HIDE;

                        console.log(`[PostContext] Post ${postId} reported (Mock). Count: ${newReportCount}, Hidden: ${shouldHide}`);

                        return {
                            ...p,
                            reportCount: newReportCount,
                            isHidden: shouldHide || p.isHidden,
                            hiddenAt: shouldHide && !p.isHidden ? new Date() : p.hiddenAt,
                            updatedAt: new Date(),
                        };
                    })
                );
                return true;
            }
        },
        [currentUserId, posts, useSupabase]
    );

    // 글의 신고 수 조회
    const getReportCount = useCallback(
        async (postId: string): Promise<number> => {
            if (useSupabase && isValidUUID(postId)) {
                return getReportCountFromDb(postId);
            } else {
                const post = posts.find(p => p.id === postId);
                return post?.reportCount || 0;
            }
        },
        [useSupabase, posts]
    );

    // 글이 숨겨졌는지 확인
    const isPostHidden = useCallback(
        (postId: string): boolean => {
            const post = posts.find(p => p.id === postId);
            return post?.isHidden || false;
        },
        [posts]
    );

    // 숨겨진 내 글 목록 조회
    const getHiddenPosts = useCallback((): Post[] => {
        if (!currentUserId) return [];
        return posts.filter(p => p.userId === currentUserId && p.isHidden);
    }, [posts, currentUserId]);

    const value = useMemo<PostContextValue>(
        () => ({
            posts,
            isLoading,
            isFromSupabase,
            getPostById,
            getPostsByEvent,
            getPostsByUser,
            getCommunityPosts,
            getHubFeed,
            createPost,
            updatePost,
            deletePost,
            updatePostStatus,
            bumpPost,
            incrementCurrentPeople,
            decrementCurrentPeople,
            refreshPosts,
            reportPost,
            getReportCount,
            isPostHidden,
            getHiddenPosts,
        }),
        [
            posts,
            isLoading,
            isFromSupabase,
            getPostById,
            getPostsByEvent,
            getPostsByUser,
            getCommunityPosts,
            getHubFeed,
            createPost,
            updatePost,
            deletePost,
            updatePostStatus,
            bumpPost,
            incrementCurrentPeople,
            decrementCurrentPeople,
            refreshPosts,
            reportPost,
            getReportCount,
            isPostHidden,
            getHiddenPosts,
        ]
    );

    return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
}

// ===== Hook =====

export function usePost() {
    const context = useContext(PostContext);
    if (!context) {
        throw new Error("usePost must be used within a PostProvider");
    }
    return context;
}
