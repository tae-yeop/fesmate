"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Comment as CommentType, CreateCommentInput } from "@/types/comment";
import { createSharedAdapter, DOMAINS } from "./storage";
import { useAuth } from "./auth-context";
import { isValidUUID } from "./utils";
import {
    getCommentsByPostId as getCommentsFromDB,
    createComment as createCommentInDB,
    updateComment as updateCommentInDB,
    deleteComment as deleteCommentInDB,
    Comment as DbComment,
} from "./supabase/queries/comments";

// Storage adapter (전역 공유 데이터 - 비로그인 시 사용)
const commentsAdapter = createSharedAdapter<CommentType[]>({
    domain: DOMAINS.COMMENTS,
    dateFields: ["createdAt", "updatedAt"],
});

// 초기 Mock 댓글 데이터
const INITIAL_COMMENTS: CommentType[] = [
    // post3 (동행) 댓글
    {
        id: "c1",
        postId: "post3",
        userId: "user2",
        content: "저도 같이 가고 싶어요! 연락 드릴게요~",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    },
    {
        id: "c2",
        postId: "post3",
        userId: "user4",
        content: "혹시 몇 시에 만나실 예정인가요?",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전
    },
    // post1 (게이트 제보) 댓글
    {
        id: "c3",
        postId: "post1",
        userId: "user5",
        content: "감사합니다! 덕분에 빨리 들어갔어요",
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30분 전
    },
    // post4 (택시팟) 댓글
    {
        id: "c4",
        postId: "post4",
        userId: "user1",
        content: "저 참여할게요! 연락주세요",
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45분 전
    },
    {
        id: "c5",
        postId: "post4",
        userId: "user6",
        content: "저도 가능해요~ 카톡 보냈습니다",
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20분 전
    },
    // post8 (질문) 댓글
    {
        id: "c6",
        postId: "post8",
        userId: "user3",
        content: "돗자리 반입 가능해요! 작년에도 가져갔어요",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12시간 전
    },
    {
        id: "c7",
        postId: "post8",
        userId: "user5",
        content: "접이식 의자도 가능하더라고요",
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10시간 전
    },
    // post9 (팁) 댓글
    {
        id: "c8",
        postId: "post9",
        userId: "user1",
        content: "좋은 정보 감사합니다! 참고할게요",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
    },
    // post10 (후기) 댓글
    {
        id: "c9",
        postId: "post10",
        userId: "user2",
        content: "저도 봤는데 정말 좋았어요!",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8일 전
    },
    {
        id: "c10",
        postId: "post10",
        userId: "user4",
        content: "다음에 또 내한하면 꼭 가야겠어요",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일 전
    },
];

/**
 * DB Comment를 Context Comment 타입으로 변환
 */
function transformDbComment(dbComment: DbComment): CommentType {
    return {
        id: dbComment.id,
        postId: dbComment.postId,
        userId: dbComment.userId,
        content: dbComment.content,
        parentId: dbComment.parentId,
        isDeleted: dbComment.isDeleted,
        createdAt: dbComment.createdAt,
        updatedAt: dbComment.updatedAt,
    };
}

interface CommentContextType {
    // 특정 포스트의 댓글 가져오기
    getCommentsByPostId: (postId: string) => CommentType[];
    // 댓글 개수 가져오기
    getCommentCount: (postId: string) => number;
    // 댓글 추가
    addComment: (input: CreateCommentInput) => Promise<CommentType>;
    // 댓글 삭제
    deleteComment: (commentId: string) => Promise<void>;
    // 댓글 수정
    updateComment: (commentId: string, content: string) => Promise<void>;
    // 특정 포스트 댓글 로드 (Supabase에서)
    loadCommentsForPost: (postId: string) => Promise<void>;
    // 로딩 상태
    loading: boolean;
}

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export function CommentProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentType[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadedPostIds, setLoadedPostIds] = useState<Set<string>>(new Set());

    // 초기 로드 (localStorage에서 Mock 데이터)
    useEffect(() => {
        const stored = commentsAdapter.get();
        if (stored) {
            setComments(stored);
        } else {
            setComments(INITIAL_COMMENTS);
        }
        setIsInitialized(true);
    }, []);

    // 댓글 변경 시 Storage에 항상 저장 (Mock 데이터 유지용)
    useEffect(() => {
        if (isInitialized) {
            commentsAdapter.set(comments);
        }
    }, [comments, isInitialized]);

    // 특정 포스트의 댓글 Supabase에서 로드
    const loadCommentsForPost = useCallback(async (postId: string) => {
        if (!user || loadedPostIds.has(postId)) return;

        setLoading(true);
        try {
            const dbComments = await getCommentsFromDB(postId);
            const newComments = dbComments.map(transformDbComment);

            setComments(prev => {
                // 기존 댓글 중 해당 postId 제거하고 새로운 댓글로 교체
                const otherComments = prev.filter(c => c.postId !== postId);
                return [...otherComments, ...newComments];
            });

            setLoadedPostIds(prev => new Set(prev).add(postId));
        } catch (error) {
            console.error("[CommentContext] Load comments failed:", error);
            // 에러 시 기존 로컬 데이터 유지
        } finally {
            setLoading(false);
        }
    }, [user, loadedPostIds]);

    // 특정 포스트의 댓글 가져오기
    const getCommentsByPostId = useCallback((postId: string) => {
        return comments
            .filter(c => c.postId === postId && !c.isDeleted)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [comments]);

    // 댓글 개수 가져오기
    const getCommentCount = useCallback((postId: string) => {
        return comments.filter(c => c.postId === postId && !c.isDeleted).length;
    }, [comments]);

    // 댓글 추가
    const addComment = useCallback(async (input: CreateCommentInput): Promise<CommentType> => {
        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (user && isValidUUID(input.postId)) {
            try {
                const dbComment = await createCommentInDB({
                    postId: input.postId,
                    userId: user.id,
                    content: input.content,
                    parentId: input.parentId,
                });
                const newComment = transformDbComment(dbComment);
                setComments(prev => [...prev, newComment]);
                return newComment;
            } catch (error) {
                console.error("[CommentContext] Add comment failed:", error);
                throw error;
            }
        } else {
            // 비로그인 또는 Mock postId인 경우 localStorage에 저장
            const newComment: CommentType = {
                id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                postId: input.postId,
                userId: user?.id || input.userId,
                content: input.content,
                parentId: input.parentId,
                createdAt: new Date(),
            };
            setComments(prev => [...prev, newComment]);
            return newComment;
        }
    }, [user]);

    // 댓글 삭제 (soft delete)
    const deleteComment = useCallback(async (commentId: string) => {
        // Optimistic update
        setComments(prev =>
            prev.map(c =>
                c.id === commentId ? { ...c, isDeleted: true } : c
            )
        );

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (user && isValidUUID(commentId)) {
            try {
                await deleteCommentInDB(commentId);
            } catch (error) {
                console.error("[CommentContext] Delete comment failed:", error);
                // 롤백
                setComments(prev =>
                    prev.map(c =>
                        c.id === commentId ? { ...c, isDeleted: false } : c
                    )
                );
            }
        }
    }, [user]);

    // 댓글 수정
    const updateComment = useCallback(async (commentId: string, content: string) => {
        const originalComment = comments.find(c => c.id === commentId);
        if (!originalComment) return;

        // Optimistic update
        setComments(prev =>
            prev.map(c =>
                c.id === commentId
                    ? { ...c, content, updatedAt: new Date() }
                    : c
            )
        );

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (user && isValidUUID(commentId)) {
            try {
                await updateCommentInDB(commentId, content);
            } catch (error) {
                console.error("[CommentContext] Update comment failed:", error);
                // 롤백
                setComments(prev =>
                    prev.map(c =>
                        c.id === commentId ? originalComment : c
                    )
                );
            }
        }
    }, [comments, user]);

    return (
        <CommentContext.Provider
            value={{
                getCommentsByPostId,
                getCommentCount,
                addComment,
                deleteComment,
                updateComment,
                loadCommentsForPost,
                loading,
            }}
        >
            {children}
        </CommentContext.Provider>
    );
}

export function useComment() {
    const context = useContext(CommentContext);
    if (context === undefined) {
        throw new Error("useComment must be used within a CommentProvider");
    }
    return context;
}
