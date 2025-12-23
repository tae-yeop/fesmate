"use client";

import Link from "next/link";
import { X, LogIn } from "lucide-react";

interface LoginPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 어떤 액션을 시도했는지 표시 */
    action?: string;
}

/**
 * 비로그인 상태에서 로그인이 필요한 기능을 시도할 때 표시되는 모달
 */
export function LoginPromptModal({ isOpen, onClose, action = "이 기능" }: LoginPromptModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 백드롭 */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* 모달 */}
            <div className="relative w-full max-w-sm mx-4 bg-background rounded-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="w-7" />
                    <h2 className="font-bold">로그인 필요</h2>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-8 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <LogIn className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">로그인이 필요해요</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        {action}을 사용하려면 로그인해주세요.<br />
                        간편하게 소셜 로그인으로 시작할 수 있어요.
                    </p>
                    <div className="space-y-2">
                        <Link
                            href="/login"
                            onClick={onClose}
                            className="block w-full bg-primary text-primary-foreground rounded-full py-3 font-medium hover:opacity-90 transition-opacity"
                        >
                            로그인하기
                        </Link>
                        <button
                            onClick={onClose}
                            className="w-full text-muted-foreground py-2 text-sm hover:text-foreground"
                        >
                            나중에 할게요
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
