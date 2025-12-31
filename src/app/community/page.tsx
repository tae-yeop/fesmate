"use client";

import { useState, useMemo, useEffect } from "react";
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
    Pencil,
    ArrowUp,
    UsersRound,
    Filter,
    ChevronRight,
    ClipboardList,
    Inbox,
    Send,
    Check,
    X,
    Calendar,
    Play,
    Lightbulb,
    PartyPopper,
    Cake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_EVENTS, MOCK_USERS } from "@/lib/mock-data";
import { usePost } from "@/lib/post-context";
import { Post, POST_TYPE_LABELS, PostType, checkBumpAvailability } from "@/types/post";
import { PostComposer } from "@/components/posts/PostComposer";
import { PostDetailModal } from "@/components/posts/PostDetailModal";
import { PostActionMenu } from "@/components/safety";
import { MapActionSheet } from "@/components/maps";
import { getDefaultMapApp, hasDefaultMapApp, openMap } from "@/lib/utils/map-deeplink";
import { maskContactInfo } from "@/lib/utils/contact-mask";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";
import { useHelpful } from "@/lib/helpful-context";
import { useBlock } from "@/lib/block-context";
import { useCrew } from "@/lib/crew-context";
import { COMMUNITY_STATUS_COLORS } from "@/lib/constants/styles";
import { CREW_GENRE_LABELS, CREW_REGIONS, CrewGenre, CrewRegion } from "@/types/crew";
import { CreateCrewModal } from "@/components/crew/CreateCrewModal";
import { LeaderboardPreview } from "@/components/leaderboard/LeaderboardPreview";
import { JoinModal } from "@/components/community/JoinModal";
import { useRouter } from "next/navigation";
import { useJoin } from "@/lib/join-context";
import { useParticipation } from "@/lib/participation-context";
import { MOCK_USER_PROFILES } from "@/lib/follow-context";

// ID로 사용자 프로필 조회 헬퍼
const getUserProfile = (userId: string) => {
    return MOCK_USER_PROFILES.find(p => p.id === userId);
};
import { PARTICIPATION_LABELS, ACTIVITY_STATUS_LABELS } from "@/types/participation";

type CategoryType = "companion" | "taxi" | "meal" | "lodge" | "transfer" | "tip" | "fanevent" | "afterparty" | "question" | "crew";

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
    const router = useRouter();
    const { user } = useAuth();
    const { isLoggedIn: isDevLoggedIn, mockUserId } = useDevContext();
    const { toggleHelpful, isHelpful, getHelpfulCount } = useHelpful();
    const { isBlocked } = useBlock();
    const { allCrews, myCrews, joinCrew, isMember, getCrewStats } = useCrew();
    const { hasRequested } = useJoin();
    const { getCommunityPosts, isLoading: isPostsLoading, isFromSupabase } = usePost();
    const {
        getReceivedRequests,
        getSentRequests,
        getReceivedPendingCount,
        getSentPendingCount,
        acceptRequest,
        declineRequest,
        cancelRequest,
        getActiveActivities,
        getActiveCount,
    } = useParticipation();

    // 내 참여 모달 상태
    const [isMyParticipationOpen, setIsMyParticipationOpen] = useState(false);
    const [participationSubTab, setParticipationSubTab] = useState<"active" | "received" | "sent">("active");

    // 내 참여 데이터
    const receivedRequests = useMemo(() => getReceivedRequests(), [getReceivedRequests]);
    const sentRequests = useMemo(() => getSentRequests(), [getSentRequests]);
    const activeActivities = useMemo(() => getActiveActivities(), [getActiveActivities]);
    const totalPendingCount = getReceivedPendingCount() + getSentPendingCount();
    const activeCount = getActiveCount();

    // 실제 로그인 또는 Dev 모드 로그인 상태 확인
    const isLoggedIn = !!user || isDevLoggedIn;

    // Hydration 에러 방지: 클라이언트 마운트 상태
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);
    const [activeCategory, setActiveCategory] = useState<CategoryType>("companion");

    // 크루 필터 상태
    const [crewRegionFilter, setCrewRegionFilter] = useState<CrewRegion | "all">("all");
    const [crewGenreFilter, setCrewGenreFilter] = useState<CrewGenre | "all">("all");
    const [selectedEventId, setSelectedEventId] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"time" | "recent" | "expiring">("time");
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [editPost, setEditPost] = useState<Post | null>(null);  // 수정할 글

    // 끌어올리기 상태 (실제로는 서버에서 관리)
    const [bumpedPosts, setBumpedPosts] = useState<Record<string, Date>>({});

    // 지도 액션시트 상태
    const [mapActionSheetOpen, setMapActionSheetOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<{ placeText: string; placeHint?: string } | null>(null);

    // 크루 생성 모달 상태
    const [isCreateCrewModalOpen, setIsCreateCrewModalOpen] = useState(false);

    // 참여 모달 상태
    const [joinPost, setJoinPost] = useState<Post | null>(null);

    const categories: Category[] = [
        { key: "companion", label: "동행", icon: Users },
        { key: "taxi", label: "택시팟", icon: Car },
        { key: "meal", label: "밥", icon: Utensils },
        { key: "lodge", label: "숙소", icon: Home },
        { key: "transfer", label: "양도", icon: Ticket },
        { key: "tip", label: "팁", icon: Lightbulb },
        { key: "fanevent", label: "팬이벤트", icon: Cake },
        { key: "afterparty", label: "뒷풀이", icon: PartyPopper },
        { key: "question", label: "질문", icon: HelpCircle },
        { key: "crew", label: "크루", icon: UsersRound },
    ];

    // 크루 필터링
    const filteredCrews = useMemo(() => {
        return allCrews.filter(crew => {
            if (crewRegionFilter !== "all" && crew.region !== crewRegionFilter && crew.region !== "전국") {
                return false;
            }
            if (crewGenreFilter !== "all" && crew.genre !== crewGenreFilter && crew.genre !== "all") {
                return false;
            }
            return true;
        });
    }, [allCrews, crewRegionFilter, crewGenreFilter]);

    // 커뮤니티 글 필터링 (차단된 사용자 제외)
    const filteredPosts = useMemo(() => {
        let posts = getCommunityPosts(activeCategory, selectedEventId === "all" ? undefined : selectedEventId);

        // 차단된 사용자 글 필터링
        posts = posts.filter(p => !isBlocked(p.userId));

        // 끌어올리기 적용 (로컬 상태의 bumpedPosts 반영)
        posts = posts.map(p => {
            const bumpedAt = bumpedPosts[p.id];
            if (bumpedAt) {
                return { ...p, lastBumpedAt: bumpedAt };
            }
            return p;
        });

        // 정렬 (끌어올려진 글은 최신순에서 상단 표시)
        if (sortBy === "time") {
            posts = posts.sort((a, b) => {
                const timeA = a.meetAt || a.departAt || a.createdAt;
                const timeB = b.meetAt || b.departAt || b.createdAt;
                return new Date(timeA).getTime() - new Date(timeB).getTime();
            });
        } else if (sortBy === "recent") {
            // 최신순: lastBumpedAt > updatedAt > createdAt 순으로 정렬
            posts = posts.sort((a, b) => {
                const timeA = a.lastBumpedAt || a.updatedAt || a.createdAt;
                const timeB = b.lastBumpedAt || b.updatedAt || b.createdAt;
                return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
        } else if (sortBy === "expiring") {
            posts = posts.sort((a, b) => {
                if (!a.expiresAt) return 1;
                if (!b.expiresAt) return -1;
                return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
            });
        }

        return posts;
    }, [activeCategory, selectedEventId, sortBy, isBlocked, bumpedPosts]);

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
        // 기본 지도앱이 설정되어 있으면 바로 열기
        if (hasDefaultMapApp()) {
            const defaultApp = getDefaultMapApp();
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

    // 끌어올리기 핸들러
    const handleBump = (post: Post) => {
        // 끌어올리기 가능 여부 확인 (로컬 상태 + post.lastBumpedAt 체크)
        const lastBumped = bumpedPosts[post.id] || post.lastBumpedAt;
        const postWithBump = { ...post, lastBumpedAt: lastBumped };
        const { canBump, remainingText } = checkBumpAvailability(postWithBump);

        if (!canBump) {
            alert(`끌어올리기는 ${remainingText}`);
            return;
        }

        // 끌어올리기 실행 (실제로는 서버 API 호출)
        setBumpedPosts(prev => ({
            ...prev,
            [post.id]: new Date(),
        }));
        alert("글이 끌어올려졌습니다!");
    };

    // 끌어올리기 가능 여부 체크 (UI 표시용)
    const getBumpStatus = (post: Post) => {
        const lastBumped = bumpedPosts[post.id] || post.lastBumpedAt;
        const postWithBump = { ...post, lastBumpedAt: lastBumped };
        return checkBumpAvailability(postWithBump);
    };

    // 현재 로그인한 유저 ID (Dev 모드 또는 실제 인증)
    const currentUserId = user?.id || mockUserId;

    // 본인 글 여부 확인
    const isOwnPost = (post: Post) => {
        return currentUserId === post.userId;
    };

    // 수정 완료 핸들러
    const handleEditComplete = (postId: string, updatedData: {
        content: string;
        maxPeople?: number;
        placeText?: string;
        placeHint?: string;
        meetTime?: string;
    }) => {
        // 실제로는 서버 API 호출
        console.log("Post updated:", postId, updatedData);
        setEditPost(null);
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
                        // 크루는 별도 카운트
                        const count = cat.key === "crew"
                            ? allCrews.length
                            : getCommunityPosts(cat.key, selectedEventId === "all" ? undefined : selectedEventId).length;

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
                    {/* 내 참여 버튼 */}
                    {isLoggedIn && (
                        <button
                            onClick={() => setIsMyParticipationOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 ml-auto"
                        >
                            <ClipboardList className="h-3.5 w-3.5" />
                            내 참여
                            {(totalPendingCount > 0 || activeCount > 0) && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] text-white",
                                    totalPendingCount > 0 ? "bg-red-500" : "bg-green-500"
                                )}>
                                    {totalPendingCount > 0 ? totalPendingCount : activeCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* 리더보드 미리보기 */}
            <section className="px-4 py-4 border-b">
                <LeaderboardPreview limit={3} />
            </section>

            {/* 크루 카테고리일 때 */}
            {activeCategory === "crew" ? (
                <>
                    {/* 크루 필터 */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto">
                        <select
                            value={crewRegionFilter}
                            onChange={(e) => setCrewRegionFilter(e.target.value as CrewRegion | "all")}
                            className="text-sm border rounded px-2 py-1.5 bg-background"
                        >
                            <option value="all">전체 지역</option>
                            {CREW_REGIONS.map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                        <select
                            value={crewGenreFilter}
                            onChange={(e) => setCrewGenreFilter(e.target.value as CrewGenre | "all")}
                            className="text-sm border rounded px-2 py-1.5 bg-background"
                        >
                            <option value="all">전체 장르</option>
                            {Object.entries(CREW_GENRE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {filteredCrews.length}개
                        </span>
                        <button
                            onClick={() => setIsCreateCrewModalOpen(true)}
                            className="ml-auto flex items-center gap-1 text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" />
                            크루 만들기
                        </button>
                    </div>

                    {/* 크루 목록 */}
                    <div className="px-4 py-4 space-y-3">
                        {filteredCrews.length > 0 ? (
                            filteredCrews.map((crew) => {
                                const stats = getCrewStats(crew.id);
                                const memberOfCrew = isMember(crew.id);

                                return (
                                    <Link
                                        key={crew.id}
                                        href={`/crew/${crew.id}`}
                                        className="block rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* 로고 */}
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                                                {crew.logoEmoji || "👥"}
                                            </div>

                                            {/* 정보 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-sm">{crew.name}</h3>
                                                    {memberOfCrew && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                                            가입됨
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 태그 */}
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                                        {crew.region}
                                                    </span>
                                                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                                        {CREW_GENRE_LABELS[crew.genre]}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {stats.memberCount}명
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        · {crew.joinType === "open" ? "자유가입" : "승인제"}
                                                    </span>
                                                </div>

                                                {/* 설명 */}
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {crew.description}
                                                </p>
                                            </div>

                                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-12">
                                <UsersRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-muted-foreground mb-2">
                                    조건에 맞는 크루가 없어요
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    필터를 변경하거나 새 크루를 만들어보세요!
                                </p>
                            </div>
                        )}

                        {/* 크루 만들기 CTA */}
                        <Link
                            href="/crew/new"
                            className="block rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-center hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="font-medium text-sm">새 크루 만들기</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                함께 공연 다닐 사람들과 크루를 만들어보세요
                            </p>
                        </Link>
                    </div>
                </>
            ) : (
                <>
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
                                    "rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow cursor-pointer",
                                    isExpired && "opacity-60"
                                )}
                                onClick={() => setSelectedPost(post)}
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
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

                                {/* 제목/내용 - 비로그인 시 연락처 마스킹 */}
                                <p className="font-medium mb-2 line-clamp-2">
                                    {isLoggedIn ? post.content : maskContactInfo(post.content)}
                                </p>

                                {/* 행사 정보 */}
                                <Link
                                    href={`/event/${post.eventId}`}
                                    className="text-xs text-primary hover:underline mb-2 block"
                                >
                                    📍 {getEventName(post.eventId)}
                                </Link>

                                {/* 상세 정보 */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    {post.meetAt && isMounted && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatMeetTime(post.meetAt)}
                                        </span>
                                    )}
                                    {post.departAt && isMounted && (
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
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleHelpful(post.id);
                                        }}
                                        className={cn(
                                            "flex items-center gap-1 transition-colors",
                                            isHelpful(post.id)
                                                ? "text-primary font-medium"
                                                : "hover:text-primary"
                                        )}
                                    >
                                        <ThumbsUp className={cn("h-3 w-3", isHelpful(post.id) && "fill-current")} />
                                        {getHelpfulCount(post.id, post.helpfulCount)} 도움됨
                                    </button>
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
                                    <Link
                                        href={`/user/${post.userId}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-muted-foreground hover:text-primary hover:underline"
                                    >
                                        by {getUserNickname(post.userId)}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        {/* 본인 글이고 마감되지 않은 경우: 수정 & 끌어올리기 버튼 */}
                                        {isOwnPost(post) && !isExpired && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditPost(post);
                                                    }}
                                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-medium"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                    수정
                                                </button>
                                                {(() => {
                                                    const { canBump, remainingText } = getBumpStatus(post);
                                                    return (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleBump(post);
                                                            }}
                                                            disabled={!canBump}
                                                            className={cn(
                                                                "flex items-center gap-1 text-xs font-medium",
                                                                canBump
                                                                    ? "text-primary hover:underline"
                                                                    : "text-muted-foreground cursor-not-allowed"
                                                            )}
                                                            title={!canBump ? remainingText : "글을 목록 상단으로 끌어올립니다"}
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                            {canBump ? "끌어올리기" : remainingText}
                                                        </button>
                                                    );
                                                })()}
                                            </>
                                        )}
                                        {/* 참여 버튼 (본인 글이 아니고 모집 인원이 있는 경우) */}
                                        {!isOwnPost(post) && post.maxPeople && (
                                            (() => {
                                                const isFull = (post.currentPeople || 0) >= post.maxPeople;
                                                const alreadyRequested = hasRequested(post.id);
                                                const isDisabled = isExpired || isFull;
                                                const buttonText = isExpired
                                                    ? "마감됨"
                                                    : isFull
                                                        ? "모집 완료"
                                                        : alreadyRequested
                                                            ? "신청완료"
                                                            : "참여하기";

                                                return (
                                                    <button
                                                        disabled={isDisabled && !alreadyRequested}
                                                        className={cn(
                                                            "text-xs font-medium px-3 py-1 rounded-full transition-colors",
                                                            isDisabled && !alreadyRequested
                                                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                                : alreadyRequested
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                                                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                                        )}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // 이미 신청했으면 모달 열어서 상태 확인/취소 가능
                                                            if (alreadyRequested) {
                                                                setJoinPost(post);
                                                                return;
                                                            }
                                                            if (!isDisabled) {
                                                                // 비로그인 시 로그인 페이지로 이동
                                                                if (!isLoggedIn) {
                                                                    router.push("/login?redirect=/community");
                                                                    return;
                                                                }
                                                                // 참여 모달 열기
                                                                setJoinPost(post);
                                                            }
                                                        }}
                                                    >
                                                        {buttonText}
                                                    </button>
                                                );
                                            })()
                                        )}
                                    </div>
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
                </>
            )}

            {/* 글쓰기 FAB - 크루 카테고리가 아닐 때만 표시 */}
            {activeCategory !== "crew" && (
            <button
                onClick={() => setIsComposerOpen(true)}
                className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
                <Plus className="h-6 w-6" />
            </button>
            )}

            {/* Post Composer Modal - 새 글 작성 */}
            <PostComposer
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                eventId={selectedEventId !== "all" ? selectedEventId : undefined}
                eventTitle={selectedEvent?.title}
            />

            {/* Post Composer Modal - 글 수정 */}
            {editPost && (
                <PostComposer
                    isOpen={!!editPost}
                    onClose={() => setEditPost(null)}
                    eventId={editPost.eventId}
                    eventTitle={getEventName(editPost.eventId)}
                    editPost={{
                        id: editPost.id,
                        eventId: editPost.eventId,
                        content: editPost.content,
                        maxPeople: editPost.maxPeople,
                        price: editPost.price,
                        placeText: editPost.placeText,
                        placeHint: editPost.placeHint,
                        meetTime: editPost.meetAt
                            ? new Date(editPost.meetAt).toISOString().slice(0, 16)
                            : editPost.departAt
                                ? new Date(editPost.departAt).toISOString().slice(0, 16)
                                : undefined,
                    }}
                    onEditComplete={handleEditComplete}
                />
            )}

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

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    isOpen={!!selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}

            {/* Create Crew Modal */}
            <CreateCrewModal
                isOpen={isCreateCrewModalOpen}
                onClose={() => setIsCreateCrewModalOpen(false)}
            />

            {/* Join Modal */}
            {joinPost && (
                <JoinModal
                    post={joinPost}
                    isOpen={!!joinPost}
                    onClose={() => setJoinPost(null)}
                    onJoin={(message) => {
                        // TODO: 실제 참여 로직 (API 호출)
                        console.log("참여 신청:", joinPost.id, message);
                        // 여기서 참여 인원 증가 등의 로직 처리
                    }}
                />
            )}

            {/* 내 참여 모달 */}
            {isMyParticipationOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    {/* 배경 */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsMyParticipationOpen(false)}
                    />

                    {/* 모달 */}
                    <div className="relative w-full max-w-lg bg-background rounded-t-xl sm:rounded-xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h2 className="font-bold text-lg">내 참여</h2>
                            <button
                                onClick={() => setIsMyParticipationOpen(false)}
                                className="p-1 rounded-full hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 서브탭 */}
                        <div className="flex border-b">
                            <button
                                onClick={() => setParticipationSubTab("active")}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                                    participationSubTab === "active"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Play className="h-4 w-4" />
                                참여 중
                                {activeCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-green-500 text-white">
                                        {activeCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setParticipationSubTab("received")}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                                    participationSubTab === "received"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Inbox className="h-4 w-4" />
                                받은 신청
                                {getReceivedPendingCount() > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">
                                        {getReceivedPendingCount()}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setParticipationSubTab("sent")}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                                    participationSubTab === "sent"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Send className="h-4 w-4" />
                                보낸 신청
                                {getSentPendingCount() > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-500 text-white">
                                        {getSentPendingCount()}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* 목록 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {participationSubTab === "active" ? (
                                // 참여 중인 활동
                                activeActivities.length > 0 ? (
                                    activeActivities.map((activity) => {
                                        const post = getCommunityPosts().find(p => p.id === activity.postId);
                                        const author = getUserProfile(activity.postAuthorId);
                                        const postTypeInfo = PARTICIPATION_LABELS[activity.postType || "companion"];
                                        const statusInfo = ACTIVITY_STATUS_LABELS[activity.activityStatus];

                                        return (
                                            <div
                                                key={activity.id}
                                                className={cn(
                                                    "rounded-lg border bg-card p-4 transition-colors cursor-pointer hover:border-primary/50",
                                                    activity.activityStatus === "ongoing" && "border-green-500 bg-green-50 dark:bg-green-900/10",
                                                    activity.activityStatus === "completed" && "opacity-60"
                                                )}
                                                onClick={() => {
                                                    // 원글로 이동
                                                    if (post) {
                                                        setIsMyParticipationOpen(false);
                                                        setSelectedPost(post);
                                                    }
                                                }}
                                            >
                                                {/* 상단: 상태 + 타입 */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-lg">{postTypeInfo?.icon || "📋"}</span>
                                                    <span className="font-medium text-sm">
                                                        {postTypeInfo?.noun || "활동"}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs px-2 py-0.5 rounded-full font-medium",
                                                        statusInfo.color === "green" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                        statusInfo.color === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                                        statusInfo.color === "gray" && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                    )}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>

                                                {/* 상대방 정보 */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0">
                                                        {author?.avatar || "👤"}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium">
                                                            {author?.nickname || "알 수 없음"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground ml-1">
                                                            님과 함께
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 예정 시간 & 장소 */}
                                                {(activity.scheduledAt || activity.activityLocation) && (
                                                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                                                        {activity.scheduledAt && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                                <span className="font-medium">
                                                                    {new Intl.DateTimeFormat("ko-KR", {
                                                                        month: "long",
                                                                        day: "numeric",
                                                                        weekday: "short",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    }).format(new Date(activity.scheduledAt))}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {activity.activityLocation && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                                <span>{activity.activityLocation}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenMap(activity.activityLocation!);
                                                                    }}
                                                                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                    지도
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 원글 보기 링크 */}
                                                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                                    <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                                                        {post?.content.slice(0, 40) || "글을 찾을 수 없음"}...
                                                    </p>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12">
                                        <Play className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-muted-foreground font-medium">참여 중인 활동이 없어요</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            동행/택시팟/밥약 등에 참여하면 여기에 표시돼요
                                        </p>
                                    </div>
                                )
                            ) : participationSubTab === "received" ? (
                                // 받은 신청
                                receivedRequests.length > 0 ? (
                                    receivedRequests.map((req) => {
                                        const post = getCommunityPosts().find(p => p.id === req.postId);
                                        const applicant = getUserProfile(req.applicantId);
                                        const postTypeLabel = post ? (PARTICIPATION_LABELS[post.type]?.noun || post.type) : "게시글";

                                        return (
                                            <div key={req.id} className="rounded-lg border bg-card p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* 신청자 아바타 */}
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">
                                                        {applicant?.avatar || "👤"}
                                                    </div>

                                                    {/* 내용 */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm">
                                                                {applicant?.nickname || "알 수 없음"}
                                                            </span>
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                {postTypeLabel}
                                                            </span>
                                                            <span className={cn(
                                                                "text-xs px-1.5 py-0.5 rounded",
                                                                req.status === "pending" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                                                req.status === "accepted" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                                req.status === "declined" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                                req.status === "canceled" && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                            )}>
                                                                {req.status === "pending" && "대기 중"}
                                                                {req.status === "accepted" && "수락됨"}
                                                                {req.status === "declined" && "거절됨"}
                                                                {req.status === "canceled" && "취소됨"}
                                                            </span>
                                                        </div>

                                                        {/* 글 제목 */}
                                                        {post && (
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                                                "{post.content.slice(0, 50)}..."
                                                            </p>
                                                        )}

                                                        {/* 메시지 */}
                                                        {req.message && (
                                                            <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 mb-2">
                                                                "{req.message}"
                                                            </p>
                                                        )}

                                                        {/* 시간 */}
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {getRelativeTime(req.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 액션 버튼 */}
                                                {req.status === "pending" && (
                                                    <div className="flex gap-2 mt-3 pt-3 border-t">
                                                        <button
                                                            onClick={() => acceptRequest(req.id)}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            수락
                                                        </button>
                                                        <button
                                                            onClick={() => declineRequest(req.id)}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
                                                        >
                                                            <X className="h-4 w-4" />
                                                            거절
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12">
                                        <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-muted-foreground font-medium">받은 신청이 없어요</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            내 글에 참여 신청이 들어오면 여기에 표시돼요
                                        </p>
                                    </div>
                                )
                            ) : (
                                // 보낸 신청
                                sentRequests.length > 0 ? (
                                    sentRequests.map((req) => {
                                        const post = getCommunityPosts().find(p => p.id === req.postId);
                                        const author = getUserProfile(req.postAuthorId);
                                        const postTypeLabel = post ? (PARTICIPATION_LABELS[post.type]?.noun || post.type) : "게시글";

                                        return (
                                            <div key={req.id} className="rounded-lg border bg-card p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* 글 작성자 아바타 */}
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">
                                                        {author?.avatar || "👤"}
                                                    </div>

                                                    {/* 내용 */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm">
                                                                {author?.nickname || "알 수 없음"}
                                                            </span>
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                {postTypeLabel}
                                                            </span>
                                                            <span className={cn(
                                                                "text-xs px-1.5 py-0.5 rounded",
                                                                req.status === "pending" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                                                req.status === "accepted" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                                req.status === "declined" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                                req.status === "canceled" && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                            )}>
                                                                {req.status === "pending" && "대기 중"}
                                                                {req.status === "accepted" && "수락됨"}
                                                                {req.status === "declined" && "거절됨"}
                                                                {req.status === "canceled" && "취소됨"}
                                                            </span>
                                                        </div>

                                                        {/* 글 제목 */}
                                                        {post && (
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                                                "{post.content.slice(0, 50)}..."
                                                            </p>
                                                        )}

                                                        {/* 내가 보낸 메시지 */}
                                                        {req.message && (
                                                            <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 mb-2">
                                                                내 메시지: "{req.message}"
                                                            </p>
                                                        )}

                                                        {/* 시간 */}
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {getRelativeTime(req.createdAt)}
                                                            {req.respondedAt && (
                                                                <span className="ml-2">
                                                                    · 응답: {getRelativeTime(req.respondedAt)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 취소 버튼 (대기 중일 때만) */}
                                                {req.status === "pending" && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <button
                                                            onClick={() => cancelRequest(req.id)}
                                                            className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm text-muted-foreground font-medium"
                                                        >
                                                            <X className="h-4 w-4" />
                                                            신청 취소
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12">
                                        <Send className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-muted-foreground font-medium">보낸 신청이 없어요</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            다른 사람의 글에 참여 신청하면 여기에 표시돼요
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
