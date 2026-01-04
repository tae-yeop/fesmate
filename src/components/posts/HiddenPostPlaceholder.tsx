"use client";

import { useState } from "react";
import { AlertTriangle, Eye, Ban, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Post } from "@/types/post";
import { useBlock } from "@/lib/block-context";

interface HiddenPostPlaceholderProps {
    post: Post;
    className?: string;
    /** 보기 버튼 클릭 시 호출 (실제 내용 표시) */
    onReveal?: () => void;
    /** 차단 완료 후 호출 */
    onBlockComplete?: () => void;
}

/**
 * 숨김 글 플레이스홀더 컴포넌트
 * - 신고 누적으로 숨겨진 글 표시
 * - "검토 중" 메시지 + 보기/차단 CTA
 */
export function HiddenPostPlaceholder({
    post,
    className,
    onReveal,
    onBlockComplete,
}: HiddenPostPlaceholderProps) {
    const { blockUser, isBlocked } = useBlock();
    const [isRevealed, setIsRevealed] = useState(false);
    const [showConfirmBlock, setShowConfirmBlock] = useState(false);

    // 이미 차단된 사용자인 경우
    const userBlocked = isBlocked(post.userId);

    const handleReveal = () => {
        setIsRevealed(true);
        onReveal?.();
    };

    const handleBlock = () => {
        setShowConfirmBlock(true);
    };

    const confirmBlock = () => {
        blockUser(post.userId);
        setShowConfirmBlock(false);
        onBlockComplete?.();
    };

    const cancelBlock = () => {
        setShowConfirmBlock(false);
    };

    // 차단 확인 다이얼로그
    if (showConfirmBlock) {
        return (
            <div
                className={cn(
                    "rounded-lg border border-red-200 bg-red-50 p-4",
                    className
                )}
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-red-100">
                        <Ban className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-medium text-red-900 mb-1">
                            이 사용자를 차단하시겠습니까?
                        </h4>
                        <p className="text-sm text-red-700 mb-3">
                            차단하면 이 사용자의 모든 글과 댓글이 보이지 않습니다.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={confirmBlock}
                                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                차단하기
                            </button>
                            <button
                                onClick={cancelBlock}
                                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 내용 표시 (reveal 후)
    if (isRevealed) {
        return null; // 부모에서 실제 내용을 표시하도록 함
    }

    return (
        <div
            className={cn(
                "rounded-lg border border-amber-200 bg-amber-50/50 p-4",
                className
            )}
        >
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-amber-900 mb-1">
                        검토 중인 콘텐츠
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                        이 글은 여러 사용자의 신고로 인해 검토 중입니다.
                        {post.reportCount && post.reportCount > 0 && (
                            <span className="text-amber-600">
                                {" "}({post.reportCount}건의 신고)
                            </span>
                        )}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReveal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 transition-colors"
                        >
                            <Eye className="h-4 w-4" />
                            내용 보기
                        </button>
                        {!userBlocked && (
                            <button
                                onClick={handleBlock}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                            >
                                <Ban className="h-4 w-4" />
                                작성자 차단
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
