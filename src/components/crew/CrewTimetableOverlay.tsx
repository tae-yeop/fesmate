"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
    X,
    Users,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Calendar,
    Star,
    UserCheck,
    UsersRound,
    Clock,
    Search,
    LayoutGrid,
    List,
    BarChart3,
    Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrew } from "@/lib/crew-context";
import { useCrewSubgroup } from "@/lib/crew-subgroup-context";
import { useWishlist } from "@/lib/wishlist-context";
import { CreateSubgroupModal } from "./CreateSubgroupModal";
import { useMyTimetable } from "@/lib/my-timetable-context";
import { Crew, CrewMember } from "@/types/crew";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { TimetableItem, SlotMark, SLOT_MARK_PRESETS } from "@/types/my-timetable";
import { Slot } from "@/types/event";

// 오버레이 색상 팔레트 (16색 - 대규모 크루 대응)
const OVERLAY_COLORS = [
    "#3B82F6", // blue (나)
    "#10B981", // emerald
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#14B8A6", // teal
    "#F97316", // orange
    "#6366F1", // indigo
    "#84CC16", // lime
    "#06B6D4", // cyan
    "#F43F5E", // rose
    "#A855F7", // purple
    "#22C55E", // green
    "#FACC15", // yellow
    "#78716C", // stone
];

// 동적 아바타 최대 개수 계산 (멤버 수에 따라 조절)
const getMaxAvatars = (totalMembers: number) => {
    if (totalMembers <= 5) return totalMembers;
    if (totalMembers <= 10) return 3;
    return 2;
};

// 이름 태그 최대 표시 개수
const MAX_VISIBLE_TAGS = 5;

interface CrewTimetableOverlayProps {
    crew: Crew;
    eventId: string;
    slots: Slot[];
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 크루원 타임테이블 오버레이 모달
 *
 * 크루 멤버들의 타임테이블을 오버레이로 비교하여 볼 수 있습니다.
 * - 함께 보는 슬롯: 여러 크루원이 같은 슬롯을 선택한 경우
 * - 나만 보는 슬롯: 나만 선택한 슬롯
 */
export function CrewTimetableOverlay({
    crew,
    eventId,
    slots,
    isOpen,
    onClose,
}: CrewTimetableOverlayProps) {
    const { getCrewMembers, currentUserId } = useCrew();
    const { getSubgroupsByCrewId, deleteSubgroup } = useCrewSubgroup();
    const { getMarkedSlots, getTimetableItems, getFriendTimetable } = useMyTimetable();

    // 선택된 멤버 (오버레이에 표시할 멤버)
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set([currentUserId]));
    // 멤버 목록 펼침 상태
    const [showMemberList, setShowMemberList] = useState(false);
    // 슬롯 멤버 목록 모달 상태
    const [memberListModal, setMemberListModal] = useState<{
        isOpen: boolean;
        slotId: string;
        slotTitle: string;
        members: { userId: string; userNickname: string }[];
    } | null>(null);
    // 멤버 검색 쿼리
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    // N명 이상 함께 보기 필터
    const [minMembersFilter, setMinMembersFilter] = useState(2);
    // 뷰 모드 (list: 리스트, heatmap: 히트맵, stats: 통계)
    const [viewMode, setViewMode] = useState<"list" | "heatmap" | "stats">("list");
    // 히트맵 셀 클릭 시 상세 모달
    const [heatmapDetail, setHeatmapDetail] = useState<{
        day: number;
        stage: string;
        slots: { slotId: string; slot: Slot; members: CrewMember[] }[];
    } | null>(null);
    // 활성 소그룹 ID (null이면 전체)
    const [activeSubgroupId, setActiveSubgroupId] = useState<string | null>(null);
    // 소그룹 생성 모달
    const [showCreateSubgroupModal, setShowCreateSubgroupModal] = useState(false);

    // Long press 타이머 (소그룹 삭제용)
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTriggeredRef = useRef(false);

    const handleSubgroupLongPressStart = useCallback((subgroupId: string, subgroupName: string) => {
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            if (confirm(`"${subgroupName}" 소그룹을 삭제할까요?`)) {
                deleteSubgroup(subgroupId);
                if (activeSubgroupId === subgroupId) {
                    handleSelectSubgroup(null);
                }
            }
        }, 600); // 600ms long press
    }, [deleteSubgroup, activeSubgroupId]);

    const handleSubgroupLongPressEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleSubgroupClick = useCallback((subgroupId: string) => {
        // Long press가 트리거되었으면 클릭 무시
        if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
        }
        handleSelectSubgroup(subgroupId);
    }, []);

    // 크루 멤버 목록
    const crewMembers = useMemo(() => {
        return getCrewMembers(crew.id);
    }, [getCrewMembers, crew.id]);

    // 소그룹 목록
    const subgroups = useMemo(() => {
        return getSubgroupsByCrewId(crew.id);
    }, [getSubgroupsByCrewId, crew.id]);

    // 소그룹 선택 핸들러
    const handleSelectSubgroup = (subgroupId: string | null) => {
        setActiveSubgroupId(subgroupId);
        if (subgroupId === null) {
            // 전체 선택
            setSelectedMembers(new Set(crewMembers.map(m => m.userId)));
        } else {
            // 특정 소그룹 선택
            const subgroup = subgroups.find(sg => sg.id === subgroupId);
            if (subgroup) {
                setSelectedMembers(new Set(subgroup.memberIds));
            }
        }
    };

    // 검색된 멤버 목록
    const filteredCrewMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return crewMembers;
        const query = memberSearchQuery.toLowerCase();
        return crewMembers.filter(m =>
            m.userNickname.toLowerCase().includes(query)
        );
    }, [crewMembers, memberSearchQuery]);

    // 이벤트 정보
    const event = useMemo(() => {
        return MOCK_EVENTS.find(e => e.id === eventId);
    }, [eventId]);

    // 멤버 토글
    const toggleMember = (userId: string) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                // 최소 1명은 선택되어야 함
                if (next.size > 1) {
                    next.delete(userId);
                }
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    // 전체 선택/해제
    const toggleAll = () => {
        if (selectedMembers.size === crewMembers.length) {
            // 전체 선택 → 나만 선택
            setSelectedMembers(new Set([currentUserId]));
        } else {
            // 전체 선택
            setSelectedMembers(new Set(crewMembers.map(m => m.userId)));
        }
    };

    // 오버레이 데이터 계산
    const overlayData = useMemo(() => {
        const result: {
            items: (TimetableItem & { memberIds: string[] })[];
            togetherSlots: { slotId: string; slot: Slot; members: CrewMember[] }[];
            aloneSlots: { slotId: string; slot: Slot }[];
            memberSlots: Map<string, SlotMark[]>;
        } = {
            items: [],
            togetherSlots: [],
            aloneSlots: [],
            memberSlots: new Map(),
        };

        // 슬롯별로 어떤 멤버가 선택했는지 추적
        const slotToMembers = new Map<string, CrewMember[]>();

        // 선택된 각 멤버의 타임테이블 수집
        let colorIndex = 0;
        selectedMembers.forEach(userId => {
            const member = crewMembers.find(m => m.userId === userId);
            if (!member) return;

            // 타임테이블 가져오기: Context에서 먼저 확인, 없으면 Mock에서
            let marks: SlotMark[];
            const contextMarks = userId === currentUserId ? getMarkedSlots(eventId) : [];
            const mockMarks = getFriendTimetable(userId, eventId) || [];

            // Context에 데이터가 있으면 우선 사용, 없으면 Mock 사용
            marks = contextMarks.length > 0 ? contextMarks : mockMarks;

            result.memberSlots.set(userId, marks);

            // watch 마킹된 슬롯만 추적
            const watchMarks = marks.filter(m => m.type === "watch");
            watchMarks.forEach(mark => {
                const members = slotToMembers.get(mark.slotId) || [];
                members.push(member);
                slotToMembers.set(mark.slotId, members);
            });

            colorIndex++;
        });

        // 슬롯별로 함께/나만 분류
        slotToMembers.forEach((members, slotId) => {
            const slot = slots.find(s => s.id === slotId);
            if (!slot) return;

            if (members.length > 1) {
                result.togetherSlots.push({ slotId, slot, members });
            } else if (members[0]?.userId === currentUserId) {
                result.aloneSlots.push({ slotId, slot });
            }
        });

        // 시간순 정렬
        result.togetherSlots.sort((a, b) =>
            new Date(a.slot.startAt).getTime() - new Date(b.slot.startAt).getTime()
        );
        result.aloneSlots.sort((a, b) =>
            new Date(a.slot.startAt).getTime() - new Date(b.slot.startAt).getTime()
        );

        return result;
    }, [selectedMembers, crewMembers, currentUserId, eventId, slots, getMarkedSlots, getFriendTimetable]);

    // N명 이상 필터 적용된 함께 보는 슬롯
    const filteredTogetherSlots = useMemo(() => {
        return overlayData.togetherSlots.filter(
            item => item.members.length >= minMembersFilter
        );
    }, [overlayData.togetherSlots, minMembersFilter]);

    // 히트맵 데이터 계산 (일별 × 스테이지별 그리드)
    const heatmapData = useMemo(() => {
        type HeatmapCell = {
            count: number;
            slots: { slotId: string; slot: Slot; members: CrewMember[] }[];
            totalMembers: number;
        };
        const grid = new Map<string, HeatmapCell>();

        // 함께 보는 슬롯을 일별, 스테이지별로 집계
        filteredTogetherSlots.forEach(item => {
            const { slot, members } = item;
            const day = slot.day || 1;
            const stage = slot.stage || "MAIN";
            const key = `${day}-${stage}`;

            const existing = grid.get(key) || { count: 0, slots: [], totalMembers: 0 };
            existing.count += 1;
            existing.totalMembers += members.length;
            existing.slots.push(item);
            grid.set(key, existing);
        });

        // 슬롯에서 일자와 스테이지 목록 추출
        const days = [...new Set(slots.map(s => s.day || 1))].sort((a, b) => a - b);
        const stages = [...new Set(slots.map(s => s.stage || "MAIN"))];

        // 최대 참여 인원 (색상 농도 계산용)
        const values = Array.from(grid.values());
        const maxTotalMembers = values.length > 0
            ? Math.max(...values.map(v => v.totalMembers))
            : 0;

        return { grid, days, stages, maxTotalMembers };
    }, [filteredTogetherSlots, slots]);

    // 통계 데이터 계산
    const statsData = useMemo(() => {
        const memberCount = selectedMembers.size;
        if (memberCount === 0) return null;

        // 선택된 멤버들의 슬롯 수 합계
        let totalWatchCount = 0;
        selectedMembers.forEach(userId => {
            const marks = overlayData.memberSlots.get(userId) || [];
            totalWatchCount += marks.filter(m => m.type === "watch").length;
        });
        const avgSlots = totalWatchCount / memberCount;

        // 시간대별 집계
        const timeSlots = new Map<number, number>();
        overlayData.togetherSlots.forEach(item => {
            const hour = new Date(item.slot.startAt).getHours();
            timeSlots.set(hour, (timeSlots.get(hour) || 0) + item.members.length);
        });
        const peakTimeEntry = [...timeSlots.entries()].sort((a, b) => b[1] - a[1])[0];
        const peakTime = peakTimeEntry ? `${peakTimeEntry[0]}:00` : null;

        // 스테이지별 집계
        const stageStats = new Map<string, number>();
        overlayData.togetherSlots.forEach(item => {
            const stage = item.slot.stage || "MAIN";
            stageStats.set(stage, (stageStats.get(stage) || 0) + item.members.length);
        });
        const totalStageCount = [...stageStats.values()].reduce((a, b) => a + b, 0);
        const stagePercentages = [...stageStats.entries()].map(([stage, count]) => ({
            stage,
            count,
            percentage: totalStageCount > 0 ? Math.round((count / totalStageCount) * 100) : 0
        })).sort((a, b) => b.count - a.count);

        // TOP 5 슬롯
        const topSlots = [...overlayData.togetherSlots]
            .sort((a, b) => b.members.length - a.members.length)
            .slice(0, 5);

        return { avgSlots, peakTime, stagePercentages, topSlots, memberCount };
    }, [overlayData, selectedMembers]);

    // 취향 유사 멤버 추천 (Jaccard 유사도 기반)
    const similarMembers = useMemo(() => {
        const myMarks = overlayData.memberSlots.get(currentUserId) || [];
        const mySlotIds = new Set(myMarks.filter(m => m.type === "watch").map(m => m.slotId));

        if (mySlotIds.size === 0) return [];

        const similarities: {
            member: CrewMember;
            similarity: number;
            commonSlots: Slot[];
        }[] = [];

        crewMembers.forEach(member => {
            if (member.userId === currentUserId) return;
            if (!selectedMembers.has(member.userId)) return; // 선택된 멤버만 비교

            const theirMarks = overlayData.memberSlots.get(member.userId) || [];
            const theirSlotIds = new Set(theirMarks.filter(m => m.type === "watch").map(m => m.slotId));

            // Jaccard similarity: |A ∩ B| / |A ∪ B|
            const intersectionIds = [...mySlotIds].filter(id => theirSlotIds.has(id));
            const union = new Set([...mySlotIds, ...theirSlotIds]);
            const similarity = union.size > 0 ? intersectionIds.length / union.size : 0;

            if (similarity > 0) {
                const commonSlots = intersectionIds
                    .map(id => slots.find(s => s.id === id))
                    .filter((s): s is Slot => s !== undefined);

                similarities.push({
                    member,
                    similarity,
                    commonSlots,
                });
            }
        });

        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    }, [overlayData.memberSlots, currentUserId, crewMembers, selectedMembers, slots]);

    // 멤버별 색상
    const getMemberColor = (userId: string) => {
        const index = Array.from(selectedMembers).indexOf(userId);
        return OVERLAY_COLORS[index % OVERLAY_COLORS.length];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* 배경 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative w-full max-w-lg max-h-[85vh] bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95">
                {/* 헤더 */}
                <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UsersRound className="h-5 w-5 text-primary" />
                        <h2 className="font-bold">크루 타임테이블</h2>
                        <span className="text-xs text-muted-foreground">
                            {crew.name}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 컨텐츠 */}
                <div className="overflow-y-auto max-h-[calc(85vh-56px)]">
                    {/* 행사 정보 */}
                    {event && (
                        <div className="px-4 py-3 bg-muted/30 border-b">
                            <div className="flex items-center gap-3">
                                {event.posterUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={event.posterUrl}
                                        alt={event.title}
                                        className="h-12 w-9 rounded object-cover"
                                    />
                                ) : (
                                    <div className="h-12 w-9 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                        Poster
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Intl.DateTimeFormat("ko-KR", {
                                            month: "long",
                                            day: "numeric",
                                        }).format(new Date(event.startAt))}
                                    </p>
                                </div>
                                <Link
                                    href={`/event/${eventId}?tab=timetable`}
                                    className="text-xs text-primary font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                                    onClick={onClose}
                                >
                                    타임테이블
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* 소그룹 탭 */}
                    <div className="px-4 py-2 border-b overflow-x-auto">
                        <div className="flex gap-1.5 min-w-max">
                            {/* 전체 탭 */}
                            <button
                                onClick={() => handleSelectSubgroup(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                    activeSubgroupId === null
                                        ? "bg-primary text-white"
                                        : "bg-muted hover:bg-muted/80"
                                )}
                            >
                                전체 ({crewMembers.length})
                            </button>

                            {/* 소그룹 탭들 */}
                            {subgroups.map(sg => (
                                <button
                                    key={sg.id}
                                    onClick={() => handleSubgroupClick(sg.id)}
                                    onTouchStart={() => handleSubgroupLongPressStart(sg.id, sg.name)}
                                    onTouchEnd={handleSubgroupLongPressEnd}
                                    onTouchCancel={handleSubgroupLongPressEnd}
                                    onMouseDown={() => handleSubgroupLongPressStart(sg.id, sg.name)}
                                    onMouseUp={handleSubgroupLongPressEnd}
                                    onMouseLeave={handleSubgroupLongPressEnd}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors select-none",
                                        activeSubgroupId === sg.id
                                            ? "bg-primary text-white"
                                            : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    {sg.emoji} {sg.name} ({sg.memberIds.length})
                                </button>
                            ))}

                            {/* 소그룹 추가 버튼 */}
                            <button
                                onClick={() => setShowCreateSubgroupModal(true)}
                                className="px-2.5 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
                                title="소그룹 추가"
                            >
                                ➕
                            </button>
                        </div>
                        {subgroups.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                소그룹을 길게 눌러 삭제할 수 있어요
                            </p>
                        )}
                    </div>

                    {/* 멤버 선택 */}
                    <div className="px-4 py-3 border-b">
                        <button
                            onClick={() => setShowMemberList(!showMemberList)}
                            className="w-full flex items-center justify-between py-2"
                        >
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    멤버 선택
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ({selectedMembers.size}/{crewMembers.length}명)
                                </span>
                            </div>
                            {showMemberList ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>

                        {showMemberList && (
                            <div className="mt-2 space-y-1">
                                {/* 멤버 검색 입력 */}
                                <div className="px-1 pb-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="멤버 검색..."
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        {memberSearchQuery && (
                                            <button
                                                onClick={() => setMemberSearchQuery("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                            >
                                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 전체 선택 버튼 (검색 중이 아닐 때만) */}
                                {!memberSearchQuery && (
                                    <button
                                        onClick={toggleAll}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm"
                                    >
                                        {selectedMembers.size === crewMembers.length ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-primary" />
                                        )}
                                        <span className="flex-1 text-left">
                                            {selectedMembers.size === crewMembers.length
                                                ? "나만 보기"
                                                : "전체 선택"}
                                        </span>
                                    </button>
                                )}

                                {/* 멤버 목록 */}
                                {filteredCrewMembers.length > 0 ? filteredCrewMembers.map((member, index) => {
                                    const isSelected = selectedMembers.has(member.userId);
                                    const isMe = member.userId === currentUserId;
                                    const memberMarks = overlayData.memberSlots.get(member.userId) || [];
                                    const watchCount = memberMarks.filter(m => m.type === "watch").length;

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
                                            {/* 색상 인디케이터 */}
                                            <div
                                                className={cn(
                                                    "h-3 w-3 rounded-full",
                                                    isSelected ? "" : "opacity-30"
                                                )}
                                                style={{
                                                    backgroundColor: isSelected
                                                        ? getMemberColor(member.userId)
                                                        : "#9CA3AF",
                                                }}
                                            />

                                            {/* 닉네임 */}
                                            <span className={cn(
                                                "flex-1 text-left",
                                                isSelected ? "font-medium" : "text-muted-foreground"
                                            )}>
                                                {member.userNickname}
                                                {isMe && (
                                                    <span className="ml-1 text-[10px] text-primary">(나)</span>
                                                )}
                                            </span>

                                            {/* 슬롯 수 */}
                                            <span className="text-xs text-muted-foreground">
                                                {watchCount > 0 ? `${watchCount}개 슬롯` : "선택 없음"}
                                            </span>

                                            {/* 선택 아이콘 */}
                                            {isSelected ? (
                                                <Eye className="h-4 w-4 text-primary" />
                                            ) : (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                    );
                                }) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        검색 결과가 없습니다
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 선택된 멤버 뱃지 */}
                        {!showMemberList && selectedMembers.size > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {Array.from(selectedMembers).map(userId => {
                                    const member = crewMembers.find(m => m.userId === userId);
                                    if (!member) return null;
                                    const isMe = userId === currentUserId;

                                    return (
                                        <span
                                            key={userId}
                                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                                            style={{
                                                backgroundColor: `${getMemberColor(userId)}20`,
                                                color: getMemberColor(userId),
                                            }}
                                        >
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: getMemberColor(userId) }}
                                            />
                                            {member.userNickname}
                                            {isMe && " (나)"}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 뷰 모드 탭 */}
                    <div className="px-4 py-2 border-b flex gap-1">
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                viewMode === "list"
                                    ? "bg-primary text-white"
                                    : "bg-muted hover:bg-muted/80"
                            )}
                        >
                            <List className="h-3.5 w-3.5" />
                            리스트
                        </button>
                        <button
                            onClick={() => setViewMode("heatmap")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                viewMode === "heatmap"
                                    ? "bg-primary text-white"
                                    : "bg-muted hover:bg-muted/80"
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            히트맵
                        </button>
                        <button
                            onClick={() => setViewMode("stats")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                viewMode === "stats"
                                    ? "bg-primary text-white"
                                    : "bg-muted hover:bg-muted/80"
                            )}
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            통계
                        </button>
                    </div>

                    {/* 리스트 뷰 - 함께 보는 슬롯 */}
                    {viewMode === "list" && (
                    <>
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-green-500" />
                                함께 보는 공연
                                {filteredTogetherSlots.length > 0 && (
                                    <span className="text-xs font-normal text-muted-foreground">
                                        ({filteredTogetherSlots.length}개)
                                    </span>
                                )}
                            </h3>

                            {/* N명 이상 필터 드롭다운 */}
                            <select
                                value={minMembersFilter}
                                onChange={(e) => setMinMembersFilter(Number(e.target.value))}
                                className="text-xs px-2 py-1 rounded-lg border bg-white text-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                                <option value={2}>2명+</option>
                                <option value={3}>3명+</option>
                                <option value={4}>4명+</option>
                                <option value={5}>5명+</option>
                            </select>
                        </div>

                        {filteredTogetherSlots.length > 0 ? (
                            <div className="space-y-2">
                                {filteredTogetherSlots.map(({ slotId, slot, members }) => (
                                    <div
                                        key={slotId}
                                        className="p-3 rounded-lg bg-green-50 border border-green-200"
                                    >
                                        {(() => {
                                            // 동적 아바타 축약
                                            const maxAvatars = getMaxAvatars(members.length);
                                            const visibleAvatars = members.slice(0, maxAvatars);
                                            const hiddenAvatarCount = members.length - maxAvatars;

                                            // 이름 태그 축약
                                            const visibleTags = members.slice(0, MAX_VISIBLE_TAGS);
                                            const hiddenTagCount = members.length - MAX_VISIBLE_TAGS;

                                            return (
                                                <>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm text-green-900">
                                                                {slot.title || slot.artist?.name || "무제"}
                                                            </p>
                                                            <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                                                                <Clock className="h-3 w-3" />
                                                                {new Intl.DateTimeFormat("ko-KR", {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                }).format(new Date(slot.startAt))}
                                                                {slot.stage && (
                                                                    <>
                                                                        <span className="mx-1">·</span>
                                                                        {slot.stage}
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="flex -space-x-1">
                                                            {visibleAvatars.map((member) => (
                                                                <div
                                                                    key={member.userId}
                                                                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-green-50"
                                                                    style={{
                                                                        backgroundColor: getMemberColor(member.userId),
                                                                    }}
                                                                    title={member.userNickname}
                                                                >
                                                                    {member.userNickname[0]}
                                                                </div>
                                                            ))}
                                                            {hiddenAvatarCount > 0 && (
                                                                <div className="h-6 w-6 rounded-full bg-green-200 flex items-center justify-center text-[10px] font-medium text-green-800 ring-2 ring-green-50">
                                                                    +{hiddenAvatarCount}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 멤버 이름 (축약 + 모달) */}
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {visibleTags.map(member => (
                                                            <span
                                                                key={member.userId}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"
                                                            >
                                                                {member.userNickname}
                                                            </span>
                                                        ))}
                                                        {hiddenTagCount > 0 && (
                                                            <button
                                                                onClick={() => setMemberListModal({
                                                                    isOpen: true,
                                                                    slotId,
                                                                    slotTitle: slot.title || slot.artist?.name || "무제",
                                                                    members,
                                                                })}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-200 text-green-800 hover:bg-green-300 transition-colors"
                                                            >
                                                                +{hiddenTagCount}명 더
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                {minMembersFilter > 2 && overlayData.togetherSlots.length > 0
                                    ? `${minMembersFilter}명 이상 함께 보는 공연이 없어요`
                                    : "아직 함께 보는 공연이 없어요"}
                            </p>
                        )}
                    </div>

                    {/* 리스트 뷰 - 나만 보는 슬롯 */}
                    {overlayData.aloneSlots.length > 0 && (
                        <div className="p-4 pt-0">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                나만 보는 공연
                                <span className="text-xs font-normal text-muted-foreground">
                                    ({overlayData.aloneSlots.length}개)
                                </span>
                            </h3>

                            <div className="space-y-2">
                                {overlayData.aloneSlots.map(({ slotId, slot }) => (
                                    <div
                                        key={slotId}
                                        className="p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                                    >
                                        <p className="font-medium text-sm text-yellow-900">
                                            {slot.title || slot.artist?.name || "무제"}
                                        </p>
                                        <p className="text-xs text-yellow-700 flex items-center gap-1 mt-0.5">
                                            <Clock className="h-3 w-3" />
                                            {new Intl.DateTimeFormat("ko-KR", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }).format(new Date(slot.startAt))}
                                            {slot.stage && (
                                                <>
                                                    <span className="mx-1">·</span>
                                                    {slot.stage}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 리스트 뷰 - 빈 상태 */}
                    {overlayData.togetherSlots.length === 0 && overlayData.aloneSlots.length === 0 && (
                        <div className="p-8 text-center">
                            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground mb-2">
                                아직 선택한 공연이 없어요
                            </p>
                            <Link
                                href={`/event/${eventId}?tab=timetable`}
                                className="text-sm text-primary font-medium"
                                onClick={onClose}
                            >
                                타임테이블에서 공연 선택하기
                            </Link>
                        </div>
                    )}
                    </>
                    )}

                    {/* 히트맵 뷰 */}
                    {viewMode === "heatmap" && (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-green-500" />
                                    일별/스테이지별 참여 현황
                                </h3>
                                <select
                                    value={minMembersFilter}
                                    onChange={(e) => setMinMembersFilter(Number(e.target.value))}
                                    className="text-xs px-2 py-1 rounded-lg border bg-white text-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                    <option value={2}>2명+</option>
                                    <option value={3}>3명+</option>
                                    <option value={4}>4명+</option>
                                    <option value={5}>5명+</option>
                                </select>
                            </div>

                            {heatmapData.days.length > 0 && heatmapData.stages.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr>
                                                <th className="text-left py-2 px-1 font-medium text-muted-foreground"></th>
                                                {heatmapData.stages.map(stage => (
                                                    <th key={stage} className="py-2 px-1 text-center font-medium text-muted-foreground whitespace-nowrap">
                                                        {stage}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {heatmapData.days.map(day => (
                                                <tr key={day}>
                                                    <td className="py-1 px-1 font-medium text-muted-foreground">
                                                        DAY{day}
                                                    </td>
                                                    {heatmapData.stages.map(stage => {
                                                        const key = `${day}-${stage}`;
                                                        const cell = heatmapData.grid.get(key);
                                                        const intensity = cell && heatmapData.maxTotalMembers > 0
                                                            ? cell.totalMembers / heatmapData.maxTotalMembers
                                                            : 0;

                                                        return (
                                                            <td key={key} className="p-1">
                                                                <button
                                                                    onClick={() => cell && setHeatmapDetail({
                                                                        day,
                                                                        stage,
                                                                        slots: cell.slots
                                                                    })}
                                                                    disabled={!cell}
                                                                    className={cn(
                                                                        "h-14 w-full rounded-lg flex flex-col items-center justify-center transition-all",
                                                                        cell
                                                                            ? "cursor-pointer hover:ring-2 hover:ring-green-400"
                                                                            : "bg-muted/30"
                                                                    )}
                                                                    style={cell ? {
                                                                        backgroundColor: `rgba(34, 197, 94, ${0.15 + intensity * 0.7})`,
                                                                    } : undefined}
                                                                >
                                                                    {cell && (
                                                                        <>
                                                                            <span className="font-bold text-green-900 text-sm">
                                                                                {cell.totalMembers}
                                                                            </span>
                                                                            <span className="text-[10px] text-green-700">
                                                                                {cell.count}개 슬롯
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-8 text-center">
                                    함께 보는 공연이 없어요
                                </p>
                            )}

                            <p className="text-[10px] text-muted-foreground mt-3 text-center">
                                셀을 클릭하면 해당 영역의 슬롯을 볼 수 있어요
                            </p>
                        </div>
                    )}

                    {/* 통계 뷰 */}
                    {viewMode === "stats" && statsData && (
                        <div className="p-4 space-y-6">
                            {/* 기본 통계 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <p className="text-[10px] text-blue-600 mb-1">평균 선택 슬롯</p>
                                    <p className="text-lg font-bold text-blue-900">
                                        {statsData.avgSlots.toFixed(1)}개
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                                    <p className="text-[10px] text-purple-600 mb-1">인기 시간대</p>
                                    <p className="text-lg font-bold text-purple-900">
                                        {statsData.peakTime || "-"}
                                    </p>
                                </div>
                            </div>

                            {/* 스테이지별 선호도 */}
                            {statsData.stagePercentages.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                                        스테이지 선호도
                                    </h4>
                                    <div className="space-y-2">
                                        {statsData.stagePercentages.map(({ stage, percentage }) => (
                                            <div key={stage} className="flex items-center gap-2">
                                                <span className="text-xs w-20 truncate">{stage}</span>
                                                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium w-10 text-right">
                                                    {percentage}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TOP 5 인기 슬롯 */}
                            {statsData.topSlots.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                                        🔥 인기 TOP 5 슬롯
                                    </h4>
                                    <div className="space-y-2">
                                        {statsData.topSlots.map((item, index) => (
                                            <div
                                                key={item.slotId}
                                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                                            >
                                                <span className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                    index === 0 ? "bg-yellow-400 text-yellow-900" :
                                                    index === 1 ? "bg-gray-300 text-gray-700" :
                                                    index === 2 ? "bg-orange-300 text-orange-800" :
                                                    "bg-muted text-muted-foreground"
                                                )}>
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">
                                                        {item.slot.title || item.slot.artist?.name || "무제"}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        DAY{item.slot.day || 1} · {item.slot.stage || "MAIN"}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-green-600">
                                                    {item.members.length}명
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 취향 유사 멤버 추천 */}
                            {similarMembers.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                                        <Heart className="h-4 w-4 text-pink-500" />
                                        취향이 비슷한 멤버
                                    </h4>
                                    <div className="space-y-2">
                                        {similarMembers.map((item, index) => (
                                            <div
                                                key={item.member.userId}
                                                className="p-3 rounded-lg bg-pink-50 border border-pink-200"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">
                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "•"}
                                                    </span>
                                                    <div
                                                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: getMemberColor(item.member.userId) }}
                                                    >
                                                        {item.member.userNickname[0]}
                                                    </div>
                                                    <span className="flex-1 text-sm font-medium">
                                                        {item.member.userNickname}
                                                    </span>
                                                    <span className="text-xs font-bold text-pink-600">
                                                        {Math.round(item.similarity * 100)}% 일치
                                                    </span>
                                                </div>
                                                {item.commonSlots.length > 0 && (
                                                    <p className="text-[10px] text-pink-600 mt-1.5 pl-8">
                                                        함께 선택: {item.commonSlots.slice(0, 2).map(s =>
                                                            s.title || s.artist?.name || "무제"
                                                        ).join(", ")}
                                                        {item.commonSlots.length > 2 && ` 외 ${item.commonSlots.length - 2}개`}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 빈 상태 */}
                            {statsData.topSlots.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    아직 함께 보는 공연이 없어 통계를 볼 수 없어요
                                </p>
                            )}
                        </div>
                    )}

                    {/* 하단 여백 */}
                    <div className="h-4" />
                </div>
            </div>

            {/* 슬롯 멤버 목록 모달 */}
            {memberListModal?.isOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
                    onClick={() => setMemberListModal(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-sm w-[90%] max-h-[70vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-base">
                                    {memberListModal.slotTitle}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    함께 보는 멤버 {memberListModal.members.length}명
                                </p>
                            </div>
                            <button
                                onClick={() => setMemberListModal(null)}
                                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 멤버 목록 */}
                        <div className="p-4 overflow-y-auto max-h-[50vh]">
                            <div className="space-y-2">
                                {memberListModal.members.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div
                                            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                            style={{
                                                backgroundColor: getMemberColor(member.userId),
                                            }}
                                        >
                                            {member.userNickname[0]}
                                        </div>
                                        <span className="text-sm font-medium">
                                            {member.userNickname}
                                        </span>
                                        {member.userId === currentUserId && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                나
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 히트맵 상세 모달 */}
            {heatmapDetail && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
                    onClick={() => setHeatmapDetail(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-sm w-[90%] max-h-[70vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-base">
                                    DAY{heatmapDetail.day} · {heatmapDetail.stage}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {heatmapDetail.slots.length}개 슬롯
                                </p>
                            </div>
                            <button
                                onClick={() => setHeatmapDetail(null)}
                                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 슬롯 목록 */}
                        <div className="p-4 overflow-y-auto max-h-[50vh]">
                            <div className="space-y-2">
                                {heatmapDetail.slots.map(({ slotId, slot, members }) => (
                                    <div
                                        key={slotId}
                                        className="p-3 rounded-lg bg-green-50 border border-green-200"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-green-900">
                                                    {slot.title || slot.artist?.name || "무제"}
                                                </p>
                                                <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {new Intl.DateTimeFormat("ko-KR", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }).format(new Date(slot.startAt))}
                                                </p>
                                            </div>
                                            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                {members.length}명
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {members.slice(0, 5).map(member => (
                                                <span
                                                    key={member.userId}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"
                                                >
                                                    {member.userNickname}
                                                </span>
                                            ))}
                                            {members.length > 5 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-200 text-green-800">
                                                    +{members.length - 5}명 더
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 소그룹 생성 모달 */}
            <CreateSubgroupModal
                isOpen={showCreateSubgroupModal}
                onClose={() => setShowCreateSubgroupModal(false)}
                crewId={crew.id}
                crewMembers={crewMembers}
                currentUserId={currentUserId}
            />
        </div>
    );
}
