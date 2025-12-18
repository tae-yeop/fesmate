"use client";

import { useState } from "react";
import { X, Ban, Check } from "lucide-react";

interface BlockConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    userId: string;
    onConfirm: (userId: string) => void;
}

/**
 * 차단 확인 모달
 * - 차단 시 상호 효과 안내
 * - 확인 후 차단 처리
 */
export function BlockConfirmModal({
    isOpen,
    onClose,
    userName,
    userId,
    onConfirm,
}: BlockConfirmModalProps) {
    const [step, setStep] = useState<"confirm" | "done">("confirm");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleBlock = async () => {
        setIsSubmitting(true);

        // 실제로는 API 호출
        await new Promise(resolve => setTimeout(resolve, 300));

        onConfirm(userId);
        setIsSubmitting(false);
        setStep("done");
    };

    const handleClose = () => {
        setStep("confirm");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* 모달 */}
            <div className="relative w-full max-w-sm mx-4 bg-background rounded-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Ban className="h-5 w-5 text-red-500" />
                        사용자 차단
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 본문 */}
                {step === "confirm" && (
                    <div className="p-4 space-y-4">
                        <div className="text-center py-2">
                            <p className="font-medium mb-2">
                                <span className="text-primary">{userName}</span>
                                님을 차단하시겠습니까?
                            </p>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                            <p className="font-medium">차단하면:</p>
                            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                <li>상대방의 글과 댓글이 보이지 않습니다</li>
                                <li>상대방도 내 글과 댓글을 볼 수 없습니다</li>
                                <li>상대방에게 알림이 가지 않습니다</li>
                                <li>언제든 차단을 해제할 수 있습니다</li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 rounded-lg font-medium border hover:bg-muted transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleBlock}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? "처리 중..." : "차단하기"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "done" && (
                    <div className="p-4 space-y-4">
                        <div className="text-center py-6">
                            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Check className="h-7 w-7 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-1">
                                차단되었습니다
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                설정 &gt; 차단 관리에서 해제할 수 있습니다.
                            </p>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            확인
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
