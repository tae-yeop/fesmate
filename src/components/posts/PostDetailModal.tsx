"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X, ThumbsUp, MessageCircle, MapPin, ExternalLink, ChevronLeft, ChevronRight, Users, Clock, User, Send, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Post, POST_TYPE_LABELS } from "@/types/post";
import { getRelativeTime } from "@/lib/utils/date-format";
import { getPostTypeColor, getTrustLevelColor } from "@/lib/constants/styles";
import { useHelpful } from "@/lib/helpful-context";
import { useComment } from "@/lib/comment-context";
import { PostActionMenu } from "@/components/safety/PostActionMenu";
import { MapActionSheet } from "@/components/maps";
import { getDefaultMapApp, hasDefaultMapApp, openMap } from "@/lib/utils/map-deeplink";
import { maskContactInfo } from "@/lib/utils/contact-mask";
import { MOCK_USERS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";
import { useRouter } from "next/navigation";
import { JoinModal } from "@/components/community/JoinModal";
import { useJoin } from "@/lib/join-context";
import { LoginPromptModal } from "@/components/auth";

interface PostDetailModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
}

export function PostDetailModal({ post, isOpen, onClose }: PostDetailModalProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { isLoggedIn: isDevLoggedIn, mockUserId } = useDevContext();
    const { toggleHelpful, isHelpful, getHelpfulCount } = useHelpful();
    const { getCommentsByPostId, getCommentCount, addComment } = useComment();
    const { hasRequested } = useJoin();

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [mapActionSheetOpen, setMapActionSheetOpen] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [loginPromptAction, setLoginPromptAction] = useState("");

    const commentInputRef = useRef<HTMLInputElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // 실제 로그인 또는 Dev 모드 로그인 상태 확인
    const isLoggedIn = !!user || isDevLoggedIn;
    const currentUserId = user?.id || mockUserId;

    // 댓글 입력창 포커스
    useEffect(() => {
        if (showCommentInput && commentInputRef.current) {
            commentInputRef.current.focus();
        }
    }, [showCommentInput]);

    if (!isOpen) return null;

    // 이 포스트의 댓글 목록
    const comments = getCommentsByPostId(post.id);
    const commentCount = getCommentCount(post.id);

    // 비로그인 시 연락처 마스킹
    const displayContent = isLoggedIn ? post.content : maskContactInfo(post.content);

    // 참여 관련 타입인지 확인 (동행, 택시, 밥, 숙소)
    const isJoinableType = ["companion", "taxi", "meal", "lodge"].includes(post.type);

    // 마감 상태 확인
    const isExpired = post.expiresAt ? new Date(post.expiresAt) < new Date() : false;
    const isFull = post.maxPeople ? (post.currentPeople || 0) >= post.maxPeople : false;
    const isOwnPost = currentUserId === post.userId;
    const alreadyRequested = hasRequested(post.id);
    const canJoin = isJoinableType && !isExpired && !isFull && !isOwnPost && isLoggedIn;

    const getUserNickname = (userId: string) => {
        const foundUser = MOCK_USERS.find(u => u.id === userId);
        return foundUser?.nickname || "익명";
    };

    // 댓글 제출 핸들러
    const handleSubmitComment = () => {
        if (!commentText.trim() || !currentUserId || isSubmitting) return;

        setIsSubmitting(true);
        try {
            addComment({
                postId: post.id,
                userId: currentUserId,
                content: commentText.trim(),
            });
            setCommentText("");
            // 스크롤을 댓글 목록 끝으로
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 댓글 입력창 열기
    const handleOpenCommentInput = () => {
        if (!isLoggedIn) {
            setLoginPromptAction("댓글 작성");
            setShowLoginPrompt(true);
            return;
        }
        setShowCommentInput(true);
    };

    // 키보드 이벤트 핸들러
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    const handleOpenMap = () => {
        if (!post.placeText) return;
        if (hasDefaultMapApp()) {
            const defaultApp = getDefaultMapApp();
            openMap(defaultApp, post.placeText, post.placeHint);
        } else {
            setMapActionSheetOpen(true);
        }
    };

    const hasImages = post.images && post.images.length > 0;
    const helpfulCount = getHelpfulCount(post.id, post.helpfulCount);
    const helpful = isHelpful(post.id);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-lg mx-0 sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded", getPostTypeColor(post.type))}>
                            {POST_TYPE_LABELS[post.type] || post.type}
                        </span>
                        {post.trustLevel && (
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                getTrustLevelColor(post.trustLevel)
                            )}>
                                신뢰도 {post.trustLevel}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {/* Image Carousel */}
                    {hasImages && (
                        <div className="relative bg-muted aspect-video">
                            {/* Placeholder for images */}
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">📷</div>
                                    <p className="text-sm">이미지 {currentImageIndex + 1}/{post.images!.length}</p>
                                </div>
                            </div>

                            {/* Navigation */}
                            {post.images!.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentImageIndex === 0}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white disabled:opacity-30"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentImageIndex(prev => Math.min(post.images!.length - 1, prev + 1))}
                                        disabled={currentImageIndex === post.images!.length - 1}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white disabled:opacity-30"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </>
                            )}

                            {/* Dots */}
                            {post.images!.length > 1 && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {post.images!.map((_, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "w-2 h-2 rounded-full",
                                                index === currentImageIndex ? "bg-white" : "bg-white/50"
                                            )}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Author & Time */}
                    <div className="px-4 py-3 flex items-center justify-between border-b">
                        <Link href={`/user/${post.userId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium hover:text-primary hover:underline">{getUserNickname(post.userId)}</p>
                                <p className="text-xs text-muted-foreground">{getRelativeTime(post.createdAt)}</p>
                            </div>
                        </Link>
                        <PostActionMenu
                            targetType="post"
                            targetId={post.id}
                            targetUserId={post.userId}
                            targetUserName={getUserNickname(post.userId)}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="p-4 space-y-4">
                        {/* Text Content */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>

                        {/* Meta Info */}
                        <div className="space-y-2">
                            {/* Location */}
                            {post.placeText && (
                                <button
                                    onClick={handleOpenMap}
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    <MapPin className="h-4 w-4" />
                                    <span>{post.placeText}</span>
                                    <ExternalLink className="h-3 w-3" />
                                </button>
                            )}

                            {/* People Count */}
                            {post.maxPeople && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>모집 인원: {post.currentPeople || 0}/{post.maxPeople}명</span>
                                </div>
                            )}

                            {/* Price */}
                            {post.price && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium">가격:</span>
                                    <span>{post.price}</span>
                                </div>
                            )}

                            {/* Expiry */}
                            {post.expiresAt && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>마감: {getRelativeTime(post.expiresAt)}</span>
                                </div>
                            )}

                            {/* Video URL */}
                            {post.videoUrl && (
                                <a
                                    href={post.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    🎬 영상 보기
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}

                            {/* Rating */}
                            {post.rating && (
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className={i < post.rating! ? "text-yellow-400" : "text-gray-300"}>
                                            ★
                                        </span>
                                    ))}
                                    <span className="text-sm text-muted-foreground ml-1">({post.rating}/5)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t">
                        <div className="px-4 py-3 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">댓글 {commentCount}</span>
                        </div>
                        <div className="px-4 pb-4 space-y-3">
                            {comments.length > 0 ? (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-2">
                                        <Link
                                            href={`/user/${comment.userId}`}
                                            className="w-6 h-6 rounded-full bg-muted flex-shrink-0 flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all"
                                        >
                                            <User className="h-3 w-3 text-muted-foreground" />
                                        </Link>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/user/${comment.userId}`}
                                                    className="text-xs font-medium hover:text-primary hover:underline"
                                                >
                                                    {getUserNickname(comment.userId)}
                                                </Link>
                                                <span className="text-[10px] text-muted-foreground">{getRelativeTime(comment.createdAt)}</span>
                                                {comment.updatedAt && (
                                                    <span className="text-[10px] text-muted-foreground">(수정됨)</span>
                                                )}
                                            </div>
                                            <p className="text-sm">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                    아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
                                </p>
                            )}
                            <div ref={commentsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Footer - Action Bar */}
                <div className="border-t bg-card">
                    {showCommentInput ? (
                        // 댓글 입력 모드
                        <div className="p-3 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                ref={commentInputRef}
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="댓글을 입력하세요..."
                                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                disabled={isSubmitting}
                            />
                            <button
                                onClick={handleSubmitComment}
                                disabled={!commentText.trim() || isSubmitting}
                                className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setShowCommentInput(false);
                                    setCommentText("");
                                }}
                                className="p-2 rounded-full hover:bg-muted transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        // 기본 액션 바
                        <div className="p-4 space-y-3">
                            {/* 참여하기 버튼 (동행/택시/밥/숙소 타입인 경우) */}
                            {isJoinableType && post.maxPeople && (
                                <button
                                    disabled={(isExpired || isFull || isOwnPost) && !alreadyRequested}
                                    onClick={() => {
                                        // 이미 신청했으면 모달 열어서 상태 확인/취소 가능
                                        if (alreadyRequested) {
                                            setIsJoinModalOpen(true);
                                            return;
                                        }
                                        // 비로그인 시 로그인 페이지로 이동
                                        if (!isLoggedIn) {
                                            router.push("/login?redirect=/community");
                                            return;
                                        }
                                        // 참여 가능한 경우 모달 열기
                                        if (canJoin) {
                                            setIsJoinModalOpen(true);
                                        }
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors",
                                        alreadyRequested
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                                            : canJoin
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    <UserPlus className="h-4 w-4" />
                                    {isOwnPost
                                        ? "내가 작성한 글"
                                        : !isLoggedIn
                                        ? "로그인 후 참여 가능"
                                        : alreadyRequested
                                        ? "신청완료 (탭하여 확인)"
                                        : isExpired
                                        ? "마감됨"
                                        : isFull
                                        ? "모집 완료"
                                        : `참여하기 (${post.currentPeople || 0}/${post.maxPeople}명)`}
                                </button>
                            )}

                            {/* 도움됨 & 댓글 버튼 */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        if (!isLoggedIn) {
                                            setLoginPromptAction("도움됨 표시");
                                            setShowLoginPrompt(true);
                                            return;
                                        }
                                        toggleHelpful(post.id);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                        helpful
                                            ? "bg-primary text-primary-foreground"
                                            : "border hover:bg-accent"
                                    )}
                                >
                                    <ThumbsUp className={cn("h-4 w-4", helpful && "fill-current")} />
                                    도움됨 {helpfulCount}
                                </button>

                                <button
                                    onClick={handleOpenCommentInput}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium hover:bg-accent"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    댓글 달기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Action Sheet */}
            {post.placeText && (
                <MapActionSheet
                    isOpen={mapActionSheetOpen}
                    onClose={() => setMapActionSheetOpen(false)}
                    placeText={post.placeText}
                    placeHint={post.placeHint}
                />
            )}

            {/* Join Modal */}
            {isJoinableType && (
                <JoinModal
                    post={post}
                    isOpen={isJoinModalOpen}
                    onClose={() => setIsJoinModalOpen(false)}
                    onJoin={(message) => {
                        // TODO: 실제 참여 로직 (API 호출)
                        console.log("참여 신청:", post.id, message);
                    }}
                />
            )}

            {/* Login Prompt Modal */}
            <LoginPromptModal
                isOpen={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                action={loginPromptAction}
            />
        </div>
    );
}
