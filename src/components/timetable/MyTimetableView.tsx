"use client";

import { useState, useMemo } from "react";
import { Star, Plus, Trash2, Edit2, AlertTriangle, Users, X, Heart, UserPlus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, Slot } from "@/types/event";
import { TimetableItem, CUSTOM_EVENT_PRESETS, CustomEvent, TimeConflict, SLOT_MARK_PRESETS } from "@/types/my-timetable";
import { formatTime } from "@/lib/utils/date-format";
import { useMyTimetable } from "@/lib/my-timetable-context";
import { CustomEventModal } from "./CustomEventModal";
import { WatchTogetherModal } from "./WatchTogetherModal";
import { useDevContext } from "@/lib/dev-context";
import { useFollow } from "@/lib/follow-context";

interface MyTimetableViewProps {
    event: Event;
    slots: Slot[];
    onClose: () => void;
}

export function MyTimetableView({ event, slots, onClose }: MyTimetableViewProps) {
    const { getNow } = useDevContext();
    const now = getNow();
    const {
        getTimetableItems,
        getConflicts,
        deleteCustomEvent,
        getCustomEvents,
        getMarkedSlots,
        getSharedTimetables,
        removeSharedTimetable,
        getOverlayItems,
        addCustomEvent,
        updateCustomEvent,
        getFriendTimetable,
        addFriendToOverlay,
        removeFriendFromOverlay,
        getOverlayFriends,
    } = useMyTimetable();
    const { getFriends } = useFollow();

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CustomEvent | undefined>();
    const [showFriendModal, setShowFriendModal] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [showWatchTogetherModal, setShowWatchTogetherModal] = useState(false);

    // 내 타임테이블 아이템
    const myItems = useMemo(() => {
        return getTimetableItems(event.id, slots);
    }, [event.id, slots, getTimetableItems]);

    // 충돌 감지
    const conflicts = useMemo(() => {
        return getConflicts(event.id, slots);
    }, [event.id, slots, getConflicts]);

    // 공유된 타임테이블 (기존 링크 방식)
    const sharedTimetables = useMemo(() => {
        return getSharedTimetables(event.id);
    }, [event.id, getSharedTimetables]);

    // 오버레이에 추가된 친구 목록 (새로운 방식)
    const overlayFriendsList = useMemo(() => {
        return getOverlayFriends(event.id);
    }, [event.id, getOverlayFriends]);

    // 친구 목록 (타임테이블이 있는 친구만 표시)
    const friendsWithTimetable = useMemo(() => {
        const friends = getFriends();
        return friends.filter(friend => {
            const timetable = getFriendTimetable(friend.id, event.id);
            return timetable && timetable.length > 0;
        }).map(friend => ({
            ...friend,
            slotCount: getFriendTimetable(friend.id, event.id)?.length || 0,
            isAdded: overlayFriendsList.some(f => f.userId === friend.id),
        }));
    }, [getFriends, getFriendTimetable, event.id, overlayFriendsList]);

    // 함께 보기 활성화 가능 여부 (친구가 추가되어 있거나 공유 타임테이블이 있는 경우)
    const canShowOverlay = overlayFriendsList.length > 0 || sharedTimetables.length > 0;

    // 오버레이 데이터
    const overlayData = useMemo(() => {
        if (!showOverlay) return null;
        return getOverlayItems(event.id, slots, "나");
    }, [showOverlay, event.id, slots, getOverlayItems]);

    // 충돌 아이템 ID 목록
    const conflictItemIds = useMemo(() => {
        const ids = new Set<string>();
        conflicts.forEach(c => c.items.forEach(item => ids.add(item.id)));
        return ids;
    }, [conflicts]);

    // 커스텀 이벤트 추가/수정
    const handleAddCustomEvent = (eventData: Omit<CustomEvent, "id" | "eventId" | "createdAt">) => {
        if (editingEvent) {
            updateCustomEvent(event.id, editingEvent.id, eventData);
        } else {
            addCustomEvent(event.id, eventData);
        }
        setEditingEvent(undefined);
    };

    // 친구 추가/제거
    const handleToggleFriend = (userId: string, nickname: string) => {
        const isAdded = overlayFriendsList.some(f => f.userId === userId);
        if (isAdded) {
            removeFriendFromOverlay(userId, event.id);
        } else {
            addFriendToOverlay(userId, nickname, event.id);
        }
    };

    // 시간 그룹핑 (시간대별)
    const itemsByHour = useMemo(() => {
        const items = showOverlay && overlayData ? overlayData.items : myItems;
        const grouped: Record<number, TimetableItem[]> = {};

        items.forEach(item => {
            const hour = new Date(item.startAt).getHours();
            if (!grouped[hour]) grouped[hour] = [];
            grouped[hour].push(item);
        });

        return grouped;
    }, [myItems, showOverlay, overlayData]);

    const sortedHours = useMemo(() => {
        return Object.keys(itemsByHour).map(Number).sort((a, b) => a - b);
    }, [itemsByHour]);

    const customEvents = getCustomEvents(event.id);
    const markedSlots = getMarkedSlots(event.id);
    const watchSlotCount = markedSlots.filter(m => m.type === "watch").length;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-lg mx-0 sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                            나만의 타임테이블
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {event.title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-3 border-b flex items-center justify-between gap-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            일정 추가
                        </button>
                        {friendsWithTimetable.length > 0 && (
                            <button
                                onClick={() => setShowFriendModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm font-medium hover:bg-accent"
                            >
                                <UserPlus className="h-4 w-4" />
                                친구 추가
                                {overlayFriendsList.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                                        {overlayFriendsList.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                    {canShowOverlay && (
                        <button
                            onClick={() => setShowOverlay(!showOverlay)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                showOverlay
                                    ? "bg-secondary text-secondary-foreground"
                                    : "border hover:bg-accent"
                            )}
                        >
                            <Users className="h-4 w-4" />
                            함께 보기 ({overlayFriendsList.length + sharedTimetables.length})
                        </button>
                    )}
                </div>

                {/* Conflicts Warning */}
                {conflicts.length > 0 && !showOverlay && (
                    <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                                {conflicts.length}개의 일정이 겹칩니다
                            </span>
                        </div>
                    </div>
                )}

                {/* Together/Alone Summary (Overlay Mode) */}
                {showOverlay && overlayData && (
                    <div className="mx-4 mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-700">
                                <Users className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                    함께 보는 슬롯: {overlayData.together.length}개
                                </span>
                            </div>
                            {overlayData.together.length > 0 && (
                                <button
                                    onClick={() => setShowWatchTogetherModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <Heart className="h-3.5 w-3.5" />
                                    같이 볼까요?
                                </button>
                            )}
                        </div>
                        {overlayData.together.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {overlayData.together.slice(0, 5).map((group, i) => (
                                    <span
                                        key={i}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                                    >
                                        {group[0].title}
                                    </span>
                                ))}
                                {overlayData.together.length > 5 && (
                                    <span className="text-xs text-blue-600">
                                        +{overlayData.together.length - 5}개
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Stats */}
                    <div className="flex flex-wrap gap-3 mb-4 text-sm">
                        {watchSlotCount > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span>⭐</span>
                                <span>보기 {watchSlotCount}개</span>
                            </div>
                        )}
                        {markedSlots.filter(m => m.type !== "watch").length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span>📋</span>
                                <span>기타 {markedSlots.filter(m => m.type !== "watch").length}개</span>
                            </div>
                        )}
                        {customEvents.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span>{CUSTOM_EVENT_PRESETS.meal.icon}</span>
                                <span>개인 일정 {customEvents.length}개</span>
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    {myItems.length > 0 || (showOverlay && overlayData && overlayData.items.length > 0) ? (
                        <div className="space-y-4">
                            {sortedHours.map(hour => (
                                <div key={hour}>
                                    <div className="text-xs text-muted-foreground font-medium mb-2">
                                        {hour.toString().padStart(2, "0")}:00
                                    </div>
                                    <div className="space-y-2">
                                        {itemsByHour[hour].map(item => {
                                            const isConflict = conflictItemIds.has(item.id);
                                            const isPast = new Date(item.endAt).getTime() < now.getTime();
                                            const isCustom = item.type === "custom";

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                                        isConflict && "border-amber-300 bg-amber-50",
                                                        isPast && !isConflict && "opacity-50",
                                                        showOverlay && item.ownerColor && "border-l-4",
                                                    )}
                                                    style={
                                                        showOverlay && item.ownerColor
                                                            ? { borderLeftColor: item.ownerColor }
                                                            : undefined
                                                    }
                                                >
                                                    {/* Icon */}
                                                    <div className="flex-shrink-0">
                                                        {isCustom ? (
                                                            <span className="text-lg">
                                                                {CUSTOM_EVENT_PRESETS[item.customEventType!].icon}
                                                            </span>
                                                        ) : item.slotMarkType ? (
                                                            <span className="text-lg">
                                                                {SLOT_MARK_PRESETS[item.slotMarkType].icon}
                                                            </span>
                                                        ) : (
                                                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-sm truncate">
                                                                {item.title}
                                                            </p>
                                                            {showOverlay && item.ownerNickname && (
                                                                <span
                                                                    className="text-xs px-1.5 py-0.5 rounded"
                                                                    style={{
                                                                        backgroundColor: item.ownerColor
                                                                            ? `${item.ownerColor}20`
                                                                            : undefined,
                                                                        color: item.ownerColor,
                                                                    }}
                                                                >
                                                                    {item.ownerNickname}
                                                                </span>
                                                            )}
                                                            {isConflict && (
                                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatTime(item.startAt)} - {formatTime(item.endAt)}
                                                            {item.stage && ` | ${item.stage}`}
                                                        </p>
                                                        {item.memo && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {item.memo}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Actions (only for custom events, not overlay) */}
                                                    {isCustom && !showOverlay && (
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    const ce = customEvents.find(e => e.id === item.id);
                                                                    if (ce) {
                                                                        setEditingEvent(ce);
                                                                        setShowAddModal(true);
                                                                    }
                                                                }}
                                                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteCustomEvent(event.id, item.id)}
                                                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium mb-1">아직 일정이 없습니다</p>
                            <p className="text-xs">
                                타임테이블에서 보고 싶은 공연에 ⭐을 눌러보세요
                            </p>
                        </div>
                    )}

                    {/* Shared Timetables List (Overlay Mode) */}
                    {showOverlay && sharedTimetables.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                            <h4 className="text-sm font-medium mb-2">함께 보는 친구</h4>
                            <div className="space-y-2">
                                {sharedTimetables.map((st, index) => (
                                    <div
                                        key={st.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][
                                                            index % 5
                                                        ],
                                                }}
                                            />
                                            <span className="text-sm">{st.ownerNickname}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({st.slotMarks.length}개 슬롯)
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeSharedTimetable(st.id)}
                                            className="p-1 rounded hover:bg-muted"
                                        >
                                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Event Modal */}
            <CustomEventModal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingEvent(undefined);
                }}
                onSubmit={handleAddCustomEvent}
                eventDate={new Date(event.startAt)}
                editEvent={editingEvent}
            />

            {/* Watch Together Modal */}
            {showOverlay && overlayData && (
                <WatchTogetherModal
                    isOpen={showWatchTogetherModal}
                    onClose={() => setShowWatchTogetherModal(false)}
                    eventId={event.id}
                    eventTitle={event.title}
                    togetherSlots={overlayData.together}
                    sharedTimetables={sharedTimetables}
                />
            )}

            {/* Friend Selection Modal */}
            {showFriendModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowFriendModal(false)} />
                    <div className="relative z-10 w-full max-w-sm bg-card rounded-2xl overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                친구 타임테이블 추가
                            </h3>
                            <button
                                onClick={() => setShowFriendModal(false)}
                                className="p-1 rounded-full hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {friendsWithTimetable.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium mb-1">
                                        이 행사에 타임테이블을 만든 친구가 없어요
                                    </p>
                                    <p className="text-xs">
                                        친구가 이 행사에서 공연을 마킹하면 여기에 표시됩니다
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        함께 보기에 추가할 친구를 선택하세요
                                    </p>
                                    {friendsWithTimetable.map((friend) => (
                                        <button
                                            key={friend.id}
                                            onClick={() => handleToggleFriend(friend.id, friend.nickname)}
                                            className={cn(
                                                "w-full p-3 rounded-xl border flex items-center gap-3 transition-all",
                                                friend.isAdded
                                                    ? "border-primary bg-primary/5"
                                                    : "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xl">
                                                {friend.avatar}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-medium">{friend.nickname}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {friend.slotCount}개 공연 마킹
                                                </p>
                                            </div>
                                            {friend.isAdded ? (
                                                <CheckCircle className="h-5 w-5 text-primary" />
                                            ) : (
                                                <Plus className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-muted/30">
                            <button
                                onClick={() => setShowFriendModal(false)}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                            >
                                완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
