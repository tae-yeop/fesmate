"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserProfile, AVATAR_OPTIONS } from "@/lib/user-profile-context";

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormData {
    nickname: string;
    avatar: string;
    bio: string;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
    const { myProfile, updateProfile } = useUserProfile();
    const [formData, setFormData] = useState<FormData>({
        nickname: "",
        avatar: "🎵",
        bio: "",
    });
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    // 모달 열릴 때 현재 프로필로 초기화
    useEffect(() => {
        if (isOpen && myProfile) {
            setFormData({
                nickname: myProfile.nickname,
                avatar: myProfile.avatar,
                bio: myProfile.bio,
            });
            setShowAvatarPicker(false);
        }
    }, [isOpen, myProfile]);

    if (!isOpen || !myProfile) return null;

    const handleSave = () => {
        // 닉네임 유효성 검사
        const trimmedNickname = formData.nickname.trim();
        if (!trimmedNickname) {
            alert("닉네임을 입력해주세요.");
            return;
        }
        if (trimmedNickname.length > 20) {
            alert("닉네임은 20자 이내로 입력해주세요.");
            return;
        }

        // 한줄소개 유효성 검사
        if (formData.bio.length > 50) {
            alert("한줄소개는 50자 이내로 입력해주세요.");
            return;
        }

        updateProfile({
            nickname: trimmedNickname,
            avatar: formData.avatar,
            bio: formData.bio.trim(),
        });
        onClose();
    };

    const handleAvatarSelect = (avatar: string) => {
        setFormData(prev => ({ ...prev, avatar }));
        setShowAvatarPicker(false);
    };

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                className="fixed inset-0 z-50 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 mx-auto max-w-md bg-background rounded-xl shadow-xl">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">프로필 편집</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors"
                        aria-label="닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-6">
                    {/* 아바타 선택 */}
                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center text-4xl hover:scale-105 transition-transform border-2 border-primary/30"
                        >
                            {formData.avatar}
                        </button>
                        <span className="text-sm text-muted-foreground">
                            탭하여 아바타 변경
                        </span>

                        {/* 아바타 피커 */}
                        {showAvatarPicker && (
                            <div className="w-full p-3 bg-muted/50 rounded-lg">
                                <div className="grid grid-cols-8 gap-2">
                                    {AVATAR_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleAvatarSelect(emoji)}
                                            className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all",
                                                formData.avatar === emoji
                                                    ? "bg-primary text-primary-foreground scale-110"
                                                    : "bg-background hover:bg-accent"
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 닉네임 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            닉네임
                        </label>
                        <input
                            type="text"
                            value={formData.nickname}
                            onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                            placeholder="닉네임을 입력하세요"
                            maxLength={20}
                            className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {formData.nickname.length}/20
                        </p>
                    </div>

                    {/* 한줄소개 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            한줄소개
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="나를 소개해보세요"
                            maxLength={50}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {formData.bio.length}/50
                        </p>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="flex gap-3 p-4 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg border font-medium hover:bg-muted transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <Check className="h-4 w-4" />
                        저장
                    </button>
                </div>
            </div>
        </>
    );
}
