"use client";

/**
 * PostContext
 *
 * 글(Post) 관리를 위한 Context
 * - 실제 로그인 사용자: Supabase DB 사용
 * - Dev 모드/비로그인: localStorage + Mock 데이터 사용
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
import { isValidUUID } from "./utils";
import { MOCK_POSTS, getCommunityPosts as getMockCommunityPosts } from "./mock-data";
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
    type CreatePostInput,
    type UpdatePostInput,
} from "./supabase/queries";

// ===== Types =====

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

export function PostProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();

    const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    // 현재 사용자 ID (실제 인증 또는 Dev 모드)
    const currentUserId = user?.id || mockUserId;
    const useSupabase = currentUserId ? isValidUUID(currentUserId) : false;

    // Supabase에서 글 로드
    const loadPostsFromSupabase = useCallback(async () => {
        if (!useSupabase) return;

        setIsLoading(true);
        try {
            // 커뮤니티 글 전체 로드
            const communityPosts = await getAllCommunityPostsFromDb(COMMUNITY_TYPES, {
                limit: 100,
            });

            if (communityPosts.length > 0) {
                // Supabase 데이터와 Mock 데이터 병합 (Supabase 우선)
                const supabaseIds = new Set(communityPosts.map(p => p.id));
                const mockOnlyPosts = MOCK_POSTS.filter(p => !supabaseIds.has(p.id));

                setPosts([...communityPosts, ...mockOnlyPosts]);
                setIsFromSupabase(true);
            }
        } catch (error) {
            console.error("[PostContext] Failed to load posts from Supabase:", error);
            // 에러 시 Mock 데이터 유지
        } finally {
            setIsLoading(false);
        }
    }, [useSupabase]);

    // 초기 로드
    useEffect(() => {
        if (useSupabase) {
            loadPostsFromSupabase();
        } else {
            setPosts(MOCK_POSTS);
            setIsFromSupabase(false);
        }
    }, [useSupabase, loadPostsFromSupabase]);

    // 새로고침
    const refreshPosts = useCallback(async () => {
        if (useSupabase) {
            await loadPostsFromSupabase();
        } else {
            setPosts(MOCK_POSTS);
        }
    }, [useSupabase, loadPostsFromSupabase]);

    // 글 ID로 조회
    const getPostById = useCallback(
        (postId: string): Post | undefined => {
            return posts.find(p => p.id === postId);
        },
        [posts]
    );

    // 이벤트별 글 조회
    const getPostsByEvent = useCallback(
        (eventId: string): Post[] => {
            return posts.filter(p => p.eventId === eventId);
        },
        [posts]
    );

    // 사용자별 글 조회
    const getPostsByUser = useCallback(
        (userId: string): Post[] => {
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

            return filtered;
        },
        [posts]
    );

    // 허브 피드 조회
    const getHubFeed = useCallback(
        (eventId: string, types?: PostType[]): Post[] => {
            const hubTypes = types || ["gate", "md", "facility", "safety"];
            return posts
                .filter(p => p.eventId === eventId && hubTypes.includes(p.type as PostType))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        [posts]
    );

    // 글 생성
    const createPost = useCallback(
        async (input: CreatePostInput): Promise<Post | null> => {
            if (!currentUserId) return null;

            if (useSupabase) {
                try {
                    const newPost = await createPostInDb(currentUserId, input);
                    setPosts(prev => [newPost, ...prev]);
                    return newPost;
                } catch (error) {
                    console.error("[PostContext] Failed to create post:", error);
                    return null;
                }
            } else {
                // Mock 모드: 로컬 상태에만 추가
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
                setPosts(prev => [newPost, ...prev]);
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
                // Mock 모드 - null을 undefined로 변환
                setPosts(prev =>
                    prev.map(p => {
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
                    })
                );
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
                // Mock 모드
                setPosts(prev => prev.filter(p => p.id !== postId));
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
