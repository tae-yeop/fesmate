"use client";

import { useState } from "react";
import { X, UserPlus, Users, MessageCircle, Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Post, POST_TYPE_LABELS, PostType } from "@/types/post";
import { MOCK_USERS } from "@/lib/mock-data";
import { useJoin } from "@/lib/join-context";

interface JoinModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
    onJoin: (message: string) => void;
}

export function JoinModal({ post, isOpen, onClose, onJoin }: JoinModalProps) {
    const { hasRequested, requestJoin, cancelJoin, getJoinRequest } = useJoin();
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const alreadyRequested = hasRequested(post.id);
    const joinRequest = getJoinRequest(post.id);

    if (!isOpen) return null;

    const getUserNickname = (userId: string) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        return user?.nickname || "익명";
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        // 실제로는 API 호출
        await new Promise(resolve => setTimeout(resolve, 500));

        // Context에 저장
        requestJoin(post.id, message);

        setIsSubmitting(false);
        setIsSuccess(true);

        // 성공 후 1초 뒤 닫기
        setTimeout(() => {
            onJoin(message);
            setMessage("");
            setIsSuccess(false);
            onClose();
        }, 1000);
    };

    const handleCancelRequest = async () => {
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        cancelJoin(post.id);
        setIsSubmitting(false);
        onClose();
    };

    const currentPeople = post.currentPeople || 0;
    const maxPeople = post.maxPeople || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-sm mx-4 bg-card rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        {alreadyRequested ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                            <UserPlus className="h-5 w-5 text-primary" />
                        )}
                        <h3 className="font-semibold">
                            {alreadyRequested ? "참여 신청 완료" : "참여 신청"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {isSuccess ? (
                        // 성공 상태
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <h4 className="font-semibold text-lg mb-1">참여 신청 완료!</h4>
                            <p className="text-sm text-muted-foreground">
                                {getUserNickname(post.userId)}님에게 알림이 전송됩니다.
                            </p>
                        </div>
                    ) : alreadyRequested ? (
                        // 이미 신청한 상태
                        <div className="py-6 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <h4 className="font-semibold text-lg mb-1">이미 참여 신청했어요</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                {getUserNickname(post.userId)}님의 승인을 기다리고 있습니다.
                            </p>

                            {/* 신청 정보 */}
                            <div className="p-3 bg-muted/50 rounded-lg text-left">
                                <p className="text-xs text-muted-foreground mb-1">내 메시지</p>
                                <p className="text-sm">
                                    {joinRequest?.message || "(메시지 없음)"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    신청일: {joinRequest?.createdAt.toLocaleDateString("ko-KR", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 글 정보 */}
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                        {POST_TYPE_LABELS[post.type as PostType] || post.type}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        by {getUserNickname(post.userId)}
                                    </span>
                                </div>
                                <p className="text-sm line-clamp-2">{post.content}</p>
                            </div>

                            {/* 모집 현황 */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">모집 현황</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                        {currentPeople}/{maxPeople}명
                                    </span>
                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${(currentPeople / maxPeople) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 메시지 입력 */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <MessageCircle className="h-4 w-4" />
                                    작성자에게 한마디 (선택)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="자기소개나 하고 싶은 말을 적어주세요..."
                                    className="w-full p-3 bg-muted/50 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20"
                                    rows={3}
                                    maxLength={200}
                                />
                                <p className="text-xs text-muted-foreground text-right mt-1">
                                    {message.length}/200
                                </p>
                            </div>

                            {/* 안내 */}
                            <p className="text-xs text-muted-foreground text-center">
                                참여 신청 시 작성자에게 알림이 전송됩니다.
                                <br />
                                연락처는 작성자 승인 후 공개됩니다.
                            </p>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isSuccess && (
                    <div className="p-4 border-t flex gap-2">
                        {alreadyRequested ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    닫기
                                </button>
                                <button
                                    onClick={handleCancelRequest}
                                    disabled={isSubmitting}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg text-sm font-medium transition-colors",
                                        "bg-red-500 text-white hover:bg-red-600",
                                        isSubmitting && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting ? "취소 중..." : "신청 취소"}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg text-sm font-medium transition-colors",
                                        "bg-primary text-primary-foreground hover:bg-primary/90",
                                        isSubmitting && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting ? "신청 중..." : "참여 신청하기"}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
