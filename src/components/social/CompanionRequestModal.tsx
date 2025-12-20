"use client";

import { useState } from "react";
import { X, Users, Send } from "lucide-react";
import { Event } from "@/types/event";
import { UserProfile } from "@/types/follow";
import { useCompanion } from "@/lib/companion-context";

interface CompanionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser: UserProfile;
    event: Event;
}

export default function CompanionRequestModal({
    isOpen,
    onClose,
    targetUser,
    event,
}: CompanionRequestModalProps) {
    const { sendRequest, getRequestStatus } = useCompanion();
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const existingStatus = getRequestStatus(targetUser.id, event.id);

    if (!isOpen) return null;

    const handleSend = async () => {
        setIsSending(true);

        // 약간의 딜레이로 전송 느낌
        await new Promise((resolve) => setTimeout(resolve, 500));

        sendRequest({
            toUserId: targetUser.id,
            eventId: event.id,
            message: message.trim() || undefined,
        });

        setIsSending(false);
        setIsSent(true);

        // 2초 후 모달 닫기
        setTimeout(() => {
            onClose();
            setMessage("");
            setIsSent(false);
        }, 1500);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
        }).format(date);
    };

    // 이미 제안한 경우
    if (existingStatus) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-black/50"
                    onClick={onClose}
                />
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center pt-2">
                        <div className="text-4xl mb-3">
                            {existingStatus === "pending" && "⏳"}
                            {existingStatus === "accepted" && "🎉"}
                            {existingStatus === "declined" && "😢"}
                            {existingStatus === "expired" && "⌛"}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {existingStatus === "pending" && "이미 제안을 보냈어요"}
                            {existingStatus === "accepted" && "동행이 확정됐어요!"}
                            {existingStatus === "declined" && "제안이 거절됐어요"}
                            {existingStatus === "expired" && "제안이 만료됐어요"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {existingStatus === "pending" && `${targetUser.nickname}님의 응답을 기다리고 있어요`}
                            {existingStatus === "accepted" && `${targetUser.nickname}님과 함께 가기로 했어요`}
                            {existingStatus === "declined" && "다음 기회에 다시 제안해보세요"}
                            {existingStatus === "expired" && "새로운 제안을 보내보세요"}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                    >
                        확인
                    </button>
                </div>
            </div>
        );
    }

    // 전송 완료
    if (isSent) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 text-center">
                    <div className="text-5xl mb-4 animate-bounce">🎉</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        제안을 보냈어요!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {targetUser.nickname}님이 응답하면 알려드릴게요
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden">
                {/* 헤더 */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            같이 갈래요?
                        </h2>
                    </div>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-4">
                    {/* 대상 사용자 */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl">
                            {targetUser.avatar}
                        </div>
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {targetUser.nickname}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                에게 동행 제안하기
                            </div>
                        </div>
                    </div>

                    {/* 행사 정보 */}
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-xl">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            함께 갈 행사
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {event.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatDate(event.startAt)}
                            {event.venue && ` · ${event.venue.name}`}
                        </div>
                    </div>

                    {/* 메시지 입력 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            메시지 (선택)
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="같이 가면 좋겠어요! 2일차 가려고 해요 ㅎㅎ"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            rows={3}
                            maxLength={200}
                        />
                        <div className="text-xs text-gray-400 text-right mt-1">
                            {message.length}/200
                        </div>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                제안 보내기
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
