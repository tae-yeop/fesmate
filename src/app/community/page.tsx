"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Users,
    Car,
    Utensils,
    Home,
    Ticket,
    MessageCircle,
    HelpCircle,
    Plus,
    Clock,
    MapPin,
    ThumbsUp,
    AlertTriangle,
    ExternalLink,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_EVENTS, MOCK_USERS, getCommunityPosts } from "@/lib/mock-data";
import { Post, POST_TYPE_LABELS, PostType } from "@/types/post";
import { PostComposer } from "@/components/posts/PostComposer";
import { PostActionMenu } from "@/components/safety";
import { MapActionSheet } from "@/components/maps";
import { getDefaultMapApp, openMap } from "@/lib/utils/map-deeplink";
import { useAuth } from "@/lib/auth-context";
import { COMMUNITY_STATUS_COLORS } from "@/lib/constants/styles";

type CategoryType = "companion" | "taxi" | "meal" | "lodge" | "transfer" | "tip" | "question";

interface Category {
    key: CategoryType;
    label: string;
    icon: React.ElementType;
}

/**
 * 커뮤니티 페이지 - PRD v0.5 기준
 * - 7개 카테고리: 동행/택시팟/밥/숙소/직거래양도/후기·팁/질문
 * - 상단 행사 필터
 * - 자동 만료 표시
 */
export default function CommunityPage() {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState<CategoryType>("companion");
    const [selectedEventId, setSelectedEventId] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"time" | "recent" | "expiring">("time");
    const [isComposerOpen, setIsComposerOpen] = useState(false);

    // 지도 액션시트 상태
    const [mapActionSheetOpen, setMapActionSheetOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<{ placeText: string; placeHint?: string } | null>(null);

    const categories: Category[] = [
        { key: "companion", label: "동행", icon: Users },
        { key: "taxi", label: "택시팟", icon: Car },
        { key: "meal", label: "밥", icon: Utensils },
        { key: "lodge", label: "숙소", icon: Home },
        { key: "transfer", label: "양도", icon: Ticket },
        { key: "tip", label: "후기·팁", icon: MessageCircle },
        { key: "question", label: "질문", icon: HelpCircle },
    ];

    // 커뮤니티 글 필터링
    const filteredPosts = useMemo(() => {
        let posts = getCommunityPosts(activeCategory, selectedEventId === "all" ? undefined : selectedEventId);

        // 정렬
        if (sortBy === "time") {
            posts = posts.sort((a, b) => {
                const timeA = a.meetAt || a.departAt || a.createdAt;
                const timeB = b.meetAt || b.departAt || b.createdAt;
                return new Date(timeA).getTime() - new Date(timeB).getTime();
            });
        } else if (sortBy === "recent") {
            posts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sortBy === "expiring") {
            posts = posts.sort((a, b) => {
                if (!a.expiresAt) return 1;
                if (!b.expiresAt) return -1;
                return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
            });
        }

        return posts;
    }, [activeCategory, selectedEventId, sortBy]);

    // 상대 시간 표시
    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        return `${days}일 전`;
    };

    // 약속 시간 포맷
    const formatMeetTime = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    // 상태 계산
    const getPostStatus = (post: Post) => {
        if (post.status === "CLOSED") return "CLOSED";
        if (post.status === "EXPIRED") return "EXPIRED";
        if (post.status === "EXPIRING") return "EXPIRING";

        if (post.expiresAt) {
            const now = new Date();
            const expiresAt = new Date(post.expiresAt);
            const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (hoursUntilExpiry <= 0) return "EXPIRED";
            if (hoursUntilExpiry <= 3) return "EXPIRING";
        }

        return "ACTIVE";
    };

    // 이벤트 이름 가져오기
    const getEventName = (eventId: string) => {
        const event = MOCK_EVENTS.find(e => e.id === eventId);
        return event?.title || "알 수 없는 행사";
    };

    // 작성자 닉네임 가져오기
    const getUserNickname = (userId: string) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        return user?.nickname || "익명";
    };

    // 선택된 이벤트 정보
    const selectedEvent = selectedEventId !== "all"
        ? MOCK_EVENTS.find(e => e.id === selectedEventId)
        : null;

    // 지도 보기 핸들러
    const handleOpenMap = (placeText: string, placeHint?: string) => {
        const defaultApp = getDefaultMapApp();
        // 기본 지도앱이 설정되어 있으면 바로 열기
        if (defaultApp && localStorage.getItem("fesmate_default_map_app")) {
            openMap(defaultApp, placeText, placeHint);
        } else {
            // 설정 안 되어 있으면 액션시트 표시
            setSelectedPlace({ placeText, placeHint });
            setMapActionSheetOpen(true);
        }
    };

    // 지도 설정 변경 핸들러 (항상 액션시트 열기)
    const handleOpenMapSettings = (placeText: string, placeHint?: string) => {
        setSelectedPlace({ placeText, placeHint });
        setMapActionSheetOpen(true);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-14 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                {/* 행사 필터 */}
                <div className="px-4 py-3">
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">전체 행사</option>
                        {MOCK_EVENTS.filter(e => e.status !== "CANCELED").map(event => (
                            <option key={event.id} value={event.id}>
                                {event.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 카테고리 탭 */}
                <div className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-2">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.key;
                        const count = getCommunityPosts(cat.key, selectedEventId === "all" ? undefined : selectedEventId).length;

                        return (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {cat.label}
                                {count > 0 && (
                                    <span className={cn(
                                        "ml-1 px-1.5 rounded-full text-[10px]",
                                        isActive ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 정렬 */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm text-muted-foreground">
                    {filteredPosts.length}개의 글
                </span>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="text-sm border rounded px-2 py-1 bg-background"
                >
                    <option value="time">약속 시간순</option>
                    <option value="recent">최신순</option>
                    <option value="expiring">마감 임박순</option>
                </select>
            </div>

            {/* 글 목록 */}
            <div className="px-4 py-4 space-y-3">
                {filteredPosts.length > 0 ? (
                    filteredPosts.map((post) => {
                        const status = getPostStatus(post);
                        const isExpired = status === "EXPIRED" || status === "CLOSED";

                        return (
                            <div
                                key={post.id}
                                className={cn(
                                    "rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow",
                                    isExpired && "opacity-60"
                                )}
                            >
                                {/* 상단 */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-xs font-medium",
                                            COMMUNITY_STATUS_COLORS[status]
                                        )}>
                                            {status === "ACTIVE" && "모집중"}
                                            {status === "EXPIRING" && "마감 임박"}
                                            {status === "EXPIRED" && "마감"}
                                            {status === "CLOSED" && "모집 완료"}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                                        )}>
                                            {POST_TYPE_LABELS[post.type as PostType] || post.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{getRelativeTime(post.createdAt)}</span>
                                        <PostActionMenu
                                            targetType="post"
                                            targetId={post.id}
                                            targetUserId={post.userId}
                                            targetUserName={getUserNickname(post.userId)}
                                            isOwner={user?.id === post.userId}
                                            onShare={() => {
                                                // 공유 기능 (추후 구현)
                                                if (navigator.share) {
                                                    navigator.share({ title: post.content, url: window.location.href });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 제목/내용 */}
                                <p className="font-medium mb-2 line-clamp-2">{post.content}</p>

                                {/* 행사 정보 */}
                                <Link
                                    href={`/event/${post.eventId}`}
                                    className="text-xs text-primary hover:underline mb-2 block"
                                >
                                    📍 {getEventName(post.eventId)}
                                </Link>

                                {/* 상세 정보 */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    {post.meetAt && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatMeetTime(post.meetAt)}
                                        </span>
                                    )}
                                    {post.departAt && (
                                        <span className="flex items-center gap-1">
                                            <Car className="h-3 w-3" />
                                            {formatMeetTime(post.departAt)}
                                        </span>
                                    )}
                                    {(post.placeText || post.location) && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {post.placeText || post.location}
                                            {post.placeText && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenMap(post.placeText!, post.placeHint);
                                                        }}
                                                        className="inline-flex items-center gap-0.5 text-primary hover:underline ml-1"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        지도
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenMapSettings(post.placeText!, post.placeHint);
                                                        }}
                                                        className="text-muted-foreground hover:text-primary"
                                                        title="지도앱 설정 변경"
                                                    >
                                                        <Settings className="h-3 w-3" />
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                    )}
                                    {post.maxPeople && (
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {post.currentPeople || 0}/{post.maxPeople}명
                                        </span>
                                    )}
                                    {post.helpfulCount > 0 && (
                                        <span className="flex items-center gap-1">
                                            <ThumbsUp className="h-3 w-3" />
                                            {post.helpfulCount}
                                        </span>
                                    )}
                                </div>

                                {/* 양도 경고 */}
                                {post.type === "transfer" && (
                                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle className="h-3 w-3" />
                                        안전 거래에 주의하세요
                                    </div>
                                )}

                                {/* 작성자 및 액션 */}
                                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        by {getUserNickname(post.userId)}
                                    </span>
                                    {!isExpired && post.maxPeople && (
                                        <button className="text-xs text-primary font-medium hover:underline">
                                            참여하기
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">아직 글이 없습니다</p>
                        <p className="text-sm mt-1">첫 번째 글을 작성해보세요!</p>
                    </div>
                )}
            </div>

            {/* 글쓰기 FAB */}
            <button
                onClick={() => setIsComposerOpen(true)}
                className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
                <Plus className="h-6 w-6" />
            </button>

            {/* Post Composer Modal */}
            <PostComposer
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                eventId={selectedEventId !== "all" ? selectedEventId : MOCK_EVENTS[0].id}
                eventTitle={selectedEvent?.title || "행사 선택"}
                initialType={activeCategory as PostType}
            />

            {/* Map Action Sheet */}
            {selectedPlace && (
                <MapActionSheet
                    isOpen={mapActionSheetOpen}
                    onClose={() => {
                        setMapActionSheetOpen(false);
                        setSelectedPlace(null);
                    }}
                    placeText={selectedPlace.placeText}
                    placeHint={selectedPlace.placeHint}
                />
            )}
        </div>
    );
}
