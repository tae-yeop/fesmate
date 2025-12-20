"use client";

import { useState } from "react";
import { X, Users, MapPin, Music, Lock, Globe, ChevronDown } from "lucide-react";
import { useCrew } from "@/lib/crew-context";
import {
    CREW_GENRE_LABELS,
    CREW_REGIONS,
    type CrewGenre,
    type CrewRegion,
    type CrewJoinType,
} from "@/types/crew";
import { useRouter } from "next/navigation";

// 크루 이모지 선택지
const CREW_EMOJIS = ["🎸", "🎤", "🎷", "🎹", "🎺", "🥁", "🎵", "🎶", "🔥", "⚡", "🌟", "💫", "👯", "🎪", "🎭", "🏆"];

interface CreateCrewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateCrewModal({ isOpen, onClose }: CreateCrewModalProps) {
    const router = useRouter();
    const { createCrew } = useCrew();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [region, setRegion] = useState<CrewRegion>("전국");
    const [genre, setGenre] = useState<CrewGenre>("all");
    const [isPublic, setIsPublic] = useState(true);
    const [joinType, setJoinType] = useState<CrewJoinType>("approval");
    const [maxMembers, setMaxMembers] = useState(20);
    const [logoEmoji, setLogoEmoji] = useState("🎵");

    const [showRegionSelect, setShowRegionSelect] = useState(false);
    const [showGenreSelect, setShowGenreSelect] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert("크루 이름을 입력해주세요.");
            return;
        }

        if (!description.trim()) {
            alert("크루 소개를 입력해주세요.");
            return;
        }

        const newCrew = createCrew({
            name: name.trim(),
            description: description.trim(),
            region,
            genre,
            isPublic,
            joinType,
            maxMembers,
            logoEmoji,
        });

        onClose();
        router.push(`/crew/${newCrew.id}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <h2 className="text-lg font-bold">크루 만들기</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 hover:bg-muted rounded-lg"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-5">
                        {/* 이모지 선택 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">크루 로고</label>
                            <div className="flex flex-wrap gap-2">
                                {CREW_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setLogoEmoji(emoji)}
                                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                                            logoEmoji === emoji
                                                ? "bg-primary/20 ring-2 ring-primary"
                                                : "bg-muted hover:bg-muted/80"
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 크루 이름 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">크루 이름 *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="크루 이름을 입력하세요"
                                maxLength={20}
                                className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {name.length}/20
                            </p>
                        </div>

                        {/* 크루 소개 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">크루 소개 *</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="크루를 소개해주세요"
                                rows={3}
                                maxLength={100}
                                className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {description.length}/100
                            </p>
                        </div>

                        {/* 지역 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">활동 지역</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowRegionSelect(!showRegionSelect)}
                                    className="w-full px-4 py-3 bg-muted rounded-lg text-left flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        {region}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${showRegionSelect ? "rotate-180" : ""}`} />
                                </button>
                                {showRegionSelect && (
                                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {CREW_REGIONS.map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => {
                                                    setRegion(r);
                                                    setShowRegionSelect(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                                                    region === r ? "bg-primary/10 text-primary" : ""
                                                }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 장르 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">주요 장르</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowGenreSelect(!showGenreSelect)}
                                    className="w-full px-4 py-3 bg-muted rounded-lg text-left flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <Music className="h-4 w-4 text-muted-foreground" />
                                        {CREW_GENRE_LABELS[genre]}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${showGenreSelect ? "rotate-180" : ""}`} />
                                </button>
                                {showGenreSelect && (
                                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {Object.entries(CREW_GENRE_LABELS).map(([key, label]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    setGenre(key as CrewGenre);
                                                    setShowGenreSelect(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                                                    genre === key ? "bg-primary/10 text-primary" : ""
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 공개 설정 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">공개 설정</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(true)}
                                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                                        isPublic
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-muted/80"
                                    }`}
                                >
                                    <Globe className="h-4 w-4" />
                                    공개
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(false)}
                                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                                        !isPublic
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-muted/80"
                                    }`}
                                >
                                    <Lock className="h-4 w-4" />
                                    비공개
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isPublic ? "누구나 크루를 찾고 가입 신청할 수 있습니다." : "초대 링크로만 가입할 수 있습니다."}
                            </p>
                        </div>

                        {/* 가입 방식 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">가입 방식</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setJoinType("open")}
                                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                                        joinType === "open"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-muted/80"
                                    }`}
                                >
                                    자유 가입
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setJoinType("approval")}
                                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                                        joinType === "approval"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-muted/80"
                                    }`}
                                >
                                    승인 필요
                                </button>
                            </div>
                        </div>

                        {/* 최대 인원 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                최대 인원: {maxMembers}명
                            </label>
                            <input
                                type="range"
                                min={5}
                                max={50}
                                step={5}
                                value={maxMembers}
                                onChange={(e) => setMaxMembers(Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>5명</span>
                                <span>50명</span>
                            </div>
                        </div>
                    </div>

                    {/* 푸터 */}
                    <div className="p-4 border-t bg-background shrink-0">
                        <button
                            type="submit"
                            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                            <Users className="h-5 w-5" />
                            크루 만들기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
