"use client";

import { useState } from "react";
import { X, Users, Send, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanion } from "@/lib/companion-context";
import { TimetableItem, SharedTimetable } from "@/types/my-timetable";

interface WatchTogetherModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
    /** 함께 보는 슬롯들 (그룹별) */
    togetherSlots: TimetableItem[][];
    /** 공유된 타임테이블 (친구 목록) */
    sharedTimetables: SharedTimetable[];
}

export function WatchTogetherModal({
    isOpen,
    onClose,
    eventId,
    eventTitle,
    togetherSlots,
    sharedTimetables,
}: WatchTogetherModalProps) {
    const { sendRequest, getRequestStatus } = useCompanion();
    const [message, setMessage] = useState("");
    const [selectedFriendIndex, setSelectedFriendIndex] = useState<number | null>(null);
    const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());

    if (!isOpen) return null;

    // 친구별 함께 보는 슬롯 계산
    const friendsWithSlots = sharedTimetables.map((st, index) => {
        const friendSlotIds = new Set(st.slotMarks.map(m => m.slotId));
        const togetherCount = togetherSlots.filter(group =>
            group.some(item => item.type === "slot" && friendSlotIds.has(item.id))
        ).length;
        return {
            index,
            timetable: st,
            togetherCount,
        };
    }).filter(f => f.togetherCount > 0);

    const handleSendRequest = (friendIndex: number, friendNickname: string) => {
        // 실제로는 친구의 userId가 필요한데, 공유 타임테이블에는 ownerId가 있을 수 있음
        const friend = sharedTimetables[friendIndex];
        const targetUserId = friend.ownerId || `shared_${friendNickname}`;

        // 함께 보는 슬롯 ID 목록
        const friendSlotIds = new Set(friend.slotMarks.map(m => m.slotId));
        const commonSlotIds = togetherSlots
            .flatMap(group => group)
            .filter(item => item.type === "slot" && friendSlotIds.has(item.id))
            .map(item => item.id)
            .filter((id, i, arr) => arr.indexOf(id) === i);

        sendRequest({
            toUserId: targetUserId,
            eventId,
            slotIds: commonSlotIds,
            message: message.trim() || undefined,
        });

        setSentRequests(prev => new Set(prev).add(friendIndex));
        setMessage("");
        setSelectedFriendIndex(null);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-card rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold">같이 볼까요?</h3>
                            <p className="text-xs text-muted-foreground">{eventTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {friendsWithSlots.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium mb-1">함께 볼 친구가 없어요</p>
                            <p className="text-xs">
                                타임테이블을 공유하고 겹치는 슬롯이 있을 때 제안할 수 있어요
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground mb-4">
                                겹치는 공연이 있는 친구에게 함께 보자고 제안해보세요!
                            </p>

                            {friendsWithSlots.map(({ index, timetable, togetherCount }) => {
                                const isSent = sentRequests.has(index);
                                const isSelected = selectedFriendIndex === index;

                                return (
                                    <div
                                        key={timetable.id}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all",
                                            isSelected && "border-primary ring-2 ring-primary/20",
                                            isSent && "bg-green-50 border-green-200"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                                                    style={{
                                                        backgroundColor:
                                                            ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][
                                                                index % 5
                                                            ],
                                                    }}
                                                >
                                                    {timetable.ownerNickname.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{timetable.ownerNickname}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {togetherCount}개 공연 겹침
                                                    </p>
                                                </div>
                                            </div>

                                            {isSent ? (
                                                <div className="flex items-center gap-1.5 text-green-600 text-sm">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>제안 완료</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedFriendIndex(isSelected ? null : index)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted hover:bg-muted/80"
                                                    )}
                                                >
                                                    {isSelected ? "선택됨" : "선택"}
                                                </button>
                                            )}
                                        </div>

                                        {/* 메시지 입력 (선택된 친구) */}
                                        {isSelected && !isSent && (
                                            <div className="mt-3 pt-3 border-t space-y-3">
                                                <textarea
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    placeholder="메시지를 남겨보세요 (선택)"
                                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                                    rows={2}
                                                />
                                                <button
                                                    onClick={() => handleSendRequest(index, timetable.ownerNickname)}
                                                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                                >
                                                    <Send className="h-4 w-4" />
                                                    같이 보자고 제안하기
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30">
                    <p className="text-xs text-muted-foreground text-center">
                        제안을 보내면 상대방에게 알림이 전송됩니다
                    </p>
                </div>
            </div>
        </div>
    );
}
