"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, Ban, Share, Trash2, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportModal } from "./ReportModal";
import { BlockConfirmModal } from "./BlockConfirmModal";
import { useBlock } from "@/lib/block-context";
import { ReportTargetType, ReportReason } from "@/types/report";

interface PostActionMenuProps {
    targetType: ReportTargetType;
    targetId: string;
    targetUserId: string;
    targetUserName: string;
    isOwner?: boolean;           // 내가 작성한 글인지
    onEdit?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    className?: string;
}

/**
 * 포스트/댓글 액션 메뉴
 * - 내 글: 수정/삭제/공유
 * - 타인 글: 신고/차단/공유
 */
export function PostActionMenu({
    targetType,
    targetId,
    targetUserId,
    targetUserName,
    isOwner = false,
    onEdit,
    onDelete,
    onShare,
    className,
}: PostActionMenuProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isBlockOpen, setIsBlockOpen] = useState(false);

    const { blockUser, isBlocked } = useBlock();
    const userIsBlocked = isBlocked(targetUserId);

    const handleReportSubmit = (reason: ReportReason, detail?: string) => {
        // 실제로는 API 호출하여 신고 저장
        console.log("Report submitted:", { targetType, targetId, targetUserId, reason, detail });
    };

    const handleBlockConfirm = (userId: string) => {
        blockUser(userId);
    };

    return (
        <>
            <div className={cn("relative", className)}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="더보기"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>

                {/* 드롭다운 메뉴 */}
                {isMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border bg-card shadow-lg py-1 text-sm">
                            {isOwner ? (
                                // 내 글 메뉴
                                <>
                                    {onEdit && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onEdit();
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                            수정
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onDelete();
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            삭제
                                        </button>
                                    )}
                                    {onShare && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onShare();
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                        >
                                            <Share className="h-4 w-4" />
                                            공유
                                        </button>
                                    )}
                                </>
                            ) : (
                                // 타인 글 메뉴
                                <>
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsReportOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                    >
                                        <Flag className="h-4 w-4" />
                                        신고하기
                                    </button>
                                    {!userIsBlocked && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsBlockOpen(true);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-red-600"
                                        >
                                            <Ban className="h-4 w-4" />
                                            차단하기
                                        </button>
                                    )}
                                    {onShare && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onShare();
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                        >
                                            <Share className="h-4 w-4" />
                                            공유
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* 신고 모달 */}
            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                targetType={targetType}
                targetId={targetId}
                targetUserId={targetUserId}
                onSubmit={handleReportSubmit}
            />

            {/* 차단 확인 모달 */}
            <BlockConfirmModal
                isOpen={isBlockOpen}
                onClose={() => setIsBlockOpen(false)}
                userName={targetUserName}
                userId={targetUserId}
                onConfirm={handleBlockConfirm}
            />
        </>
    );
}
