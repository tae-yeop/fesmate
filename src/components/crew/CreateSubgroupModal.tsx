"use client";

import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CrewMember } from "@/types/crew";
import { useCrewSubgroup } from "@/lib/crew-subgroup-context";

// 이모지 옵션
const EMOJI_OPTIONS = [
    "💜", "❤️", "🧡", "💛", "💚", "💙",
    "🎸", "🎤", "🎵", "🎶", "🎭", "🎪",
    "⭐", "✨", "🔥", "🌟", "💫", "🌈",
];

interface CreateSubgroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    crewId: string;
    crewMembers: CrewMember[];
    currentUserId: string;
}

export function CreateSubgroupModal({
    isOpen,
    onClose,
    crewId,
    crewMembers,
    currentUserId,
}: CreateSubgroupModalProps) {
    const { createSubgroup } = useCrewSubgroup();

    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("💜");
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
        new Set([currentUserId])
    );

    const handleSubmit = () => {
        if (!name.trim() || selectedMemberIds.size === 0) return;

        createSubgroup(crewId, name.trim(), emoji, Array.from(selectedMemberIds));
        onClose();

        // 초기화
        setName("");
        setEmoji("💜");
        setSelectedMemberIds(new Set([currentUserId]));
    };

    const toggleMember = (userId: string) => {
        setSelectedMemberIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-sm w-[90%] max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-base">소그룹 만들기</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 폼 */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                    {/* 이름 입력 */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">
                            그룹 이름
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 우리팀, 록밴드조"
                            className="w-full px-3 py-2 rounded-lg border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                            maxLength={20}
                        />
                    </div>

                    {/* 이모지 선택 */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">
                            이모지
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map((e) => (
                                <button
                                    key={e}
                                    onClick={() => setEmoji(e)}
                                    className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                                        emoji === e
                                            ? "bg-primary/20 ring-2 ring-primary"
                                            : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 멤버 선택 */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">
                            멤버 선택 ({selectedMemberIds.size}명)
                        </label>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {crewMembers.map((member) => {
                                const isSelected = selectedMemberIds.has(member.userId);
                                const isMe = member.userId === currentUserId;

                                return (
                                    <button
                                        key={member.userId}
                                        onClick={() => toggleMember(member.userId)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                            isSelected
                                                ? "bg-primary/10"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                isSelected
                                                    ? "bg-primary border-primary"
                                                    : "border-muted-foreground/30"
                                            )}
                                        >
                                            {isSelected && (
                                                <Check className="h-3 w-3 text-white" />
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                "flex-1 text-left",
                                                isSelected ? "font-medium" : "text-muted-foreground"
                                            )}
                                        >
                                            {member.userNickname}
                                            {isMe && (
                                                <span className="ml-1 text-[10px] text-primary">
                                                    (나)
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || selectedMemberIds.size === 0}
                        className={cn(
                            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                            name.trim() && selectedMemberIds.size > 0
                                ? "bg-primary text-white hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        만들기
                    </button>
                </div>
            </div>
        </div>
    );
}
