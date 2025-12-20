"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Comment, CreateCommentInput } from "@/types/comment";

// 초기 Mock 댓글 데이터
const INITIAL_COMMENTS: Comment[] = [
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

const STORAGE_KEY = "fesmate_comments";

interface CommentContextType {
    // 특정 포스트의 댓글 가져오기
    getCommentsByPostId: (postId: string) => Comment[];
    // 댓글 개수 가져오기
    getCommentCount: (postId: string) => number;
    // 댓글 추가
    addComment: (input: CreateCommentInput) => Comment;
    // 댓글 삭제
    deleteComment: (commentId: string) => void;
    // 댓글 수정
    updateComment: (commentId: string, content: string) => void;
}

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export function CommentProvider({ children }: { children: ReactNode }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // localStorage에서 댓글 로드
    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    // Date 문자열을 Date 객체로 변환
                    const commentsWithDates = parsed.map((c: Comment) => ({
                        ...c,
                        createdAt: new Date(c.createdAt),
                        updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
                    }));
                    setComments(commentsWithDates);
                } catch {
                    setComments(INITIAL_COMMENTS);
                }
            } else {
                setComments(INITIAL_COMMENTS);
            }
            setIsInitialized(true);
        }
    }, []);

    // 댓글 변경 시 localStorage에 저장
    useEffect(() => {
        if (isInitialized && typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
        }
    }, [comments, isInitialized]);

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
    const addComment = useCallback((input: CreateCommentInput): Comment => {
        const newComment: Comment = {
            id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            postId: input.postId,
            userId: input.userId,
            content: input.content,
            parentId: input.parentId,
            createdAt: new Date(),
        };
        setComments(prev => [...prev, newComment]);
        return newComment;
    }, []);

    // 댓글 삭제 (soft delete)
    const deleteComment = useCallback((commentId: string) => {
        setComments(prev =>
            prev.map(c =>
                c.id === commentId ? { ...c, isDeleted: true } : c
            )
        );
    }, []);

    // 댓글 수정
    const updateComment = useCallback((commentId: string, content: string) => {
        setComments(prev =>
            prev.map(c =>
                c.id === commentId
                    ? { ...c, content, updatedAt: new Date() }
                    : c
            )
        );
    }, []);

    return (
        <CommentContext.Provider
            value={{
                getCommentsByPostId,
                getCommentCount,
                addComment,
                deleteComment,
                updateComment,
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
