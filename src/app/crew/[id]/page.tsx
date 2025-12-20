"use client";

import { useParams, useRouter } from "next/navigation";
import { useCrew } from "@/lib/crew-context";
import {
    ArrowLeft,
    Users,
    Calendar,
    MapPin,
    Music,
    Crown,
    UserPlus,
    UserMinus,
    Settings,
    Star,
    CheckCircle2,
    MessageSquare,
    LogOut,
    Lock,
    Globe,
    Bell,
    Pin,
    Trash2,
    Check,
    X,
    AlertCircle,
    Plus,
    Megaphone,
} from "lucide-react";
import { CREW_GENRE_LABELS, type CrewActivityType } from "@/types/crew";
import { MOCK_EVENTS } from "@/lib/mock-data";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** 활동 타입별 아이콘 및 텍스트 */
const ACTIVITY_CONFIG: Record<CrewActivityType, { icon: typeof Star; text: string; color: string }> = {
    wishlist: { icon: Star, text: "찜했습니다", color: "text-yellow-500" },
    attended: { icon: CheckCircle2, text: "다녀왔습니다", color: "text-green-500" },
    review: { icon: MessageSquare, text: "후기를 남겼습니다", color: "text-blue-500" },
    join: { icon: UserPlus, text: "크루에 가입했습니다", color: "text-purple-500" },
    leave: { icon: LogOut, text: "크루를 떠났습니다", color: "text-gray-500" },
};

export default function CrewProfilePage() {
    const params = useParams();
    const router = useRouter();
    const crewId = params.id as string;

    const {
        getCrew,
        getCrewMembers,
        getCrewStats,
        getCrewActivities,
        getCrewEvents,
        getJoinRequests,
        getAnnouncements,
        getPendingRequestCount,
        isMember,
        isLeader,
        joinCrew,
        leaveCrew,
        requestJoinCrew,
        hasJoinRequest,
        approveJoinRequest,
        rejectJoinRequest,
        kickMember,
        createAnnouncement,
        deleteAnnouncement,
        toggleAnnouncementPin,
    } = useCrew();

    const [activeTab, setActiveTab] = useState<"activity" | "members" | "events" | "manage">("activity");
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinMessage, setJoinMessage] = useState("");
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
    const [newAnnouncementPinned, setNewAnnouncementPinned] = useState(false);
    const [kickConfirmUserId, setKickConfirmUserId] = useState<string | null>(null);

    const crew = getCrew(crewId);

    if (!crew) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-muted-foreground">크루를 찾을 수 없습니다.</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-primary hover:underline"
                    >
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const members = getCrewMembers(crewId);
    const stats = getCrewStats(crewId);
    const activities = getCrewActivities(crewId);
    const crewEvents = getCrewEvents(crewId);
    const joinRequests = getJoinRequests(crewId);
    const announcements = getAnnouncements(crewId);
    const pendingRequestCount = getPendingRequestCount(crewId);

    const userIsMember = isMember(crewId);
    const userIsLeader = isLeader(crewId);
    const userHasJoinRequest = hasJoinRequest(crewId);

    // 크루 행사 정보 (이벤트 상세 + 출처 정보)
    const crewEventDetails = crewEvents
        .map(ce => {
            const event = MOCK_EVENTS.find(e => e.id === ce.eventId);
            return event ? { event, crewEvent: ce } : null;
        })
        .filter(Boolean) as { event: typeof MOCK_EVENTS[0]; crewEvent: typeof crewEvents[0] }[];

    const handleJoin = () => {
        if (crew.joinType === "open") {
            joinCrew(crewId);
        } else {
            setShowJoinModal(true);
        }
    };

    const handleSubmitJoinRequest = () => {
        requestJoinCrew(crewId, joinMessage);
        setShowJoinModal(false);
        setJoinMessage("");
    };

    const handleCreateAnnouncement = () => {
        if (!newAnnouncementContent.trim()) return;
        createAnnouncement(crewId, newAnnouncementContent, newAnnouncementPinned);
        setShowAnnouncementModal(false);
        setNewAnnouncementContent("");
        setNewAnnouncementPinned(false);
    };

    const handleKickMember = (userId: string) => {
        kickMember(crewId, userId);
        setKickConfirmUserId(null);
    };

    const handleLeave = () => {
        if (userIsLeader) {
            alert("크루장은 탈퇴할 수 없습니다. 크루장을 위임해주세요.");
            return;
        }
        setShowLeaveConfirm(true);
    };

    const confirmLeave = () => {
        leaveCrew(crewId);
        setShowLeaveConfirm(false);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* 헤더 */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 h-14 flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-medium truncate">{crew.name}</span>
                    {userIsLeader && (
                        <button className="ml-auto p-2 hover:bg-muted rounded-lg">
                            <Settings className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 크루 프로필 헤더 */}
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-start gap-4">
                    {/* 로고 */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-4xl shrink-0">
                        {crew.logoEmoji || "👥"}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold truncate">{crew.name}</h1>
                            {crew.isPublic ? (
                                <Globe className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {crew.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                                <MapPin className="h-3 w-3" />
                                {crew.region}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                                <Music className="h-3 w-3" />
                                {CREW_GENRE_LABELS[crew.genre]}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 통계 */}
                <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-muted/50 rounded-xl">
                    <div className="text-center">
                        <div className="text-2xl font-bold">{stats.memberCount}</div>
                        <div className="text-xs text-muted-foreground">멤버</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{stats.eventCount}</div>
                        <div className="text-xs text-muted-foreground">관심 행사</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{stats.totalAttendance}</div>
                        <div className="text-xs text-muted-foreground">총 관람</div>
                    </div>
                </div>

                {/* 가입/탈퇴 버튼 */}
                <div className="mt-4">
                    {userIsMember ? (
                        <div className="flex gap-2">
                            <div className="flex-1 py-2.5 bg-muted rounded-lg text-center text-sm font-medium text-muted-foreground">
                                {userIsLeader ? "👑 크루장" : "✓ 멤버"}
                            </div>
                            {!userIsLeader && (
                                <button
                                    onClick={handleLeave}
                                    className="px-4 py-2.5 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
                                >
                                    탈퇴
                                </button>
                            )}
                        </div>
                    ) : userHasJoinRequest ? (
                        <div className="w-full py-2.5 bg-muted rounded-lg text-center text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            가입 신청 대기 중
                        </div>
                    ) : (
                        <button
                            onClick={handleJoin}
                            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            {crew.joinType === "open" ? "가입하기" : "가입 신청"}
                        </button>
                    )}
                </div>

                {/* 공지사항 (멤버에게 표시) */}
                {userIsMember && announcements.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {announcements.slice(0, 2).map(ann => (
                            <div
                                key={ann.id}
                                className={cn(
                                    "p-3 rounded-lg border text-sm",
                                    ann.isPinned ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" : "bg-muted/50"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    {ann.isPinned && <Pin className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="line-clamp-2">{ann.content}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {ann.authorNickname} · {ann.createdAt.toLocaleDateString("ko-KR")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 탭 네비게이션 */}
            <div className="border-b sticky top-14 bg-background z-30">
                <div className="container mx-auto px-4">
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {[
                            { key: "activity", label: "활동", count: activities.length },
                            { key: "members", label: "멤버", count: members.length },
                            { key: "events", label: "행사", count: crewEventDetails.length },
                            ...(userIsLeader ? [{ key: "manage", label: "관리", count: pendingRequestCount }] : []),
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                className={cn(
                                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                    activeTab === tab.key
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={cn(
                                        "ml-1.5 text-xs",
                                        tab.key === "manage" && pendingRequestCount > 0
                                            ? "px-1.5 py-0.5 bg-red-500 text-white rounded-full"
                                            : "text-muted-foreground"
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="container mx-auto px-4 py-4">
                {/* 활동 탭 */}
                {activeTab === "activity" && (
                    <div className="space-y-3">
                        {activities.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                아직 활동 내역이 없습니다.
                            </div>
                        ) : (
                            activities.map(activity => {
                                const config = ACTIVITY_CONFIG[activity.type];
                                const Icon = config.icon;

                                return (
                                    <div
                                        key={activity.id}
                                        className="p-3 bg-card rounded-lg border"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Link
                                                        href={`/user/${activity.userId}`}
                                                        className="font-medium text-sm hover:text-primary hover:underline"
                                                    >
                                                        {activity.userNickname}
                                                    </Link>
                                                    <span className="text-sm text-muted-foreground">
                                                        {config.text}
                                                    </span>
                                                </div>
                                                {activity.eventTitle && (
                                                    <p className="text-sm text-primary mt-0.5">
                                                        {activity.eventTitle}
                                                    </p>
                                                )}
                                                {activity.content && (
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                        {activity.content}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {activity.createdAt.toLocaleDateString("ko-KR")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* 멤버 탭 */}
                {activeTab === "members" && (
                    <div className="space-y-2">
                        {members.map(member => (
                            <Link
                                key={member.userId}
                                href={`/user/${member.userId}`}
                                className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-primary/50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg">
                                    {member.userAvatar || "👤"}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{member.userNickname}</span>
                                        {member.role === "leader" && (
                                            <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-500 px-1.5 py-0.5 rounded">
                                                <Crown className="h-3 w-3" />
                                                크루장
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {member.joinedAt.toLocaleDateString("ko-KR")} 가입
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* 행사 탭 */}
                {activeTab === "events" && (
                    <div className="space-y-3">
                        {crewEventDetails.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                아직 행사가 없습니다.
                            </div>
                        ) : (
                            crewEventDetails.map(({ event, crewEvent }) => (
                                <Link
                                    key={event.id}
                                    href={`/event/${event.id}`}
                                    className="block p-3 bg-card rounded-lg border hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex gap-3">
                                        {event.posterUrl && (
                                            <div className="w-16 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                                                <img
                                                    src={event.posterUrl}
                                                    alt={event.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium line-clamp-1">{event.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {event.venue?.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(event.startAt).toLocaleDateString("ko-KR")}
                                            </div>
                                            {/* 출처 정보 */}
                                            <div className="flex items-center gap-1.5 mt-2">
                                                {crewEvent.source === "attended" ? (
                                                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {crewEvent.attendedCount}명 다녀옴
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                                        <UserPlus className="h-3 w-3" />
                                                        {crewEvent.userNickname}님이 등록
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* 관리 탭 (크루장 전용) */}
                {activeTab === "manage" && userIsLeader && (
                    <div className="space-y-6">
                        {/* 가입 신청 섹션 */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    가입 신청
                                    {pendingRequestCount > 0 && (
                                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                            {pendingRequestCount}
                                        </span>
                                    )}
                                </h3>
                            </div>
                            {joinRequests.filter(r => r.status === "pending").length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                                    대기 중인 가입 신청이 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {joinRequests
                                        .filter(r => r.status === "pending")
                                        .map(request => (
                                            <div key={request.id} className="p-3 bg-card rounded-lg border">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                                                        {request.userAvatar || "👤"}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium">{request.userNickname}</p>
                                                        {request.message && (
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                                &ldquo;{request.message}&rdquo;
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {request.requestedAt.toLocaleDateString("ko-KR")} 신청
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => approveJoinRequest(request.id)}
                                                            className="p-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                                            title="승인"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => rejectJoinRequest(request.id)}
                                                            className="p-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                            title="거절"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* 공지 관리 섹션 */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Megaphone className="h-4 w-4" />
                                    공지 관리
                                </h3>
                                <button
                                    onClick={() => setShowAnnouncementModal(true)}
                                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <Plus className="h-4 w-4" />
                                    공지 작성
                                </button>
                            </div>
                            {announcements.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                                    작성된 공지가 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {announcements.map(ann => (
                                        <div
                                            key={ann.id}
                                            className={cn(
                                                "p-3 rounded-lg border",
                                                ann.isPinned ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" : "bg-card"
                                            )}
                                        >
                                            <div className="flex items-start gap-2">
                                                {ann.isPinned && <Pin className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm">{ann.content}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {ann.createdAt.toLocaleDateString("ko-KR")}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => toggleAnnouncementPin(ann.id)}
                                                        className={cn(
                                                            "p-1.5 rounded transition-colors",
                                                            ann.isPinned
                                                                ? "text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                                                : "text-muted-foreground hover:bg-muted"
                                                        )}
                                                        title={ann.isPinned ? "고정 해제" : "고정"}
                                                    >
                                                        <Pin className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAnnouncement(ann.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 멤버 관리 섹션 */}
                        <div>
                            <h3 className="font-bold flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4" />
                                멤버 관리
                            </h3>
                            <div className="space-y-2">
                                {members.map(member => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center gap-3 p-3 bg-card rounded-lg border"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg">
                                            {member.userAvatar || "👤"}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{member.userNickname}</span>
                                                {member.role === "leader" && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-500 px-1.5 py-0.5 rounded">
                                                        <Crown className="h-3 w-3" />
                                                        크루장
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {member.joinedAt.toLocaleDateString("ko-KR")} 가입
                                            </p>
                                        </div>
                                        {member.role !== "leader" && (
                                            <button
                                                onClick={() => setKickConfirmUserId(member.userId)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                title="강퇴"
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 탈퇴 확인 모달 */}
            {showLeaveConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold">크루 탈퇴</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            정말 &quot;{crew.name}&quot; 크루를 탈퇴하시겠습니까?
                        </p>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowLeaveConfirm(false)}
                                className="flex-1 py-2.5 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmLeave}
                                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                            >
                                탈퇴하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 가입 신청 모달 */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold">가입 신청</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            &quot;{crew.name}&quot; 크루에 가입 신청합니다.
                        </p>
                        <div className="mt-4">
                            <label className="text-sm font-medium mb-2 block">
                                크루장에게 한마디 (선택)
                            </label>
                            <textarea
                                value={joinMessage}
                                onChange={(e) => setJoinMessage(e.target.value)}
                                placeholder="간단한 자기소개를 적어주세요..."
                                className="w-full p-3 bg-muted/50 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20"
                                rows={3}
                                maxLength={200}
                            />
                            <p className="text-xs text-muted-foreground text-right mt-1">
                                {joinMessage.length}/200
                            </p>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowJoinModal(false);
                                    setJoinMessage("");
                                }}
                                className="flex-1 py-2.5 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmitJoinRequest}
                                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                신청하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 공지 작성 모달 */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold">공지 작성</h3>
                        <div className="mt-4">
                            <textarea
                                value={newAnnouncementContent}
                                onChange={(e) => setNewAnnouncementContent(e.target.value)}
                                placeholder="공지 내용을 입력하세요..."
                                className="w-full p-3 bg-muted/50 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20"
                                rows={4}
                                maxLength={500}
                            />
                            <p className="text-xs text-muted-foreground text-right mt-1">
                                {newAnnouncementContent.length}/500
                            </p>
                        </div>
                        <label className="flex items-center gap-2 mt-3">
                            <input
                                type="checkbox"
                                checked={newAnnouncementPinned}
                                onChange={(e) => setNewAnnouncementPinned(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">상단에 고정</span>
                        </label>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowAnnouncementModal(false);
                                    setNewAnnouncementContent("");
                                    setNewAnnouncementPinned(false);
                                }}
                                className="flex-1 py-2.5 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                disabled={!newAnnouncementContent.trim()}
                                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                작성하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 강퇴 확인 모달 */}
            {kickConfirmUserId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-destructive">멤버 강퇴</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            정말 이 멤버를 크루에서 강퇴하시겠습니까?
                            <br />
                            <span className="text-destructive">이 작업은 되돌릴 수 없습니다.</span>
                        </p>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setKickConfirmUserId(null)}
                                className="flex-1 py-2.5 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => handleKickMember(kickConfirmUserId)}
                                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                            >
                                강퇴하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
