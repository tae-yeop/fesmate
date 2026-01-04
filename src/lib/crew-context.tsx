"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    ReactNode,
} from "react";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { MOCK_USERS } from "@/lib/mock-data";
import { isValidUUID } from "@/lib/utils";
import {
    Crew,
    CrewMember,
    CrewActivity,
    CrewEvent,
    CrewJoinRequest,
    CrewAnnouncement,
    CreateCrewInput,
    CrewStats,
    CrewRegion,
    CrewGenre,
} from "@/types/crew";
import { createSharedAdapter, DOMAINS } from "./storage";
import {
    // Crew CRUD
    getPublicCrews as getPublicCrewsFromDb,
    getCrewById as getCrewByIdFromDb,
    getUserCrews as getUserCrewsFromDb,
    createCrew as createCrewInDb,
    // Crew Members
    getCrewMembers as getCrewMembersFromDb,
    isCrewMember as isCrewMemberInDb,
    isCrewLeader as isCrewLeaderInDb,
    joinCrew as joinCrewInDb,
    leaveCrew as leaveCrewInDb,
    kickMember as kickMemberInDb,
    // Join Requests
    getJoinRequests as getJoinRequestsFromDb,
    getPendingRequestCount as getPendingRequestCountFromDb,
    hasJoinRequest as hasJoinRequestInDb,
    requestJoinCrew as requestJoinCrewInDb,
    approveJoinRequest as approveJoinRequestInDb,
    rejectJoinRequest as rejectJoinRequestInDb,
    // Announcements
    getCrewAnnouncements as getCrewAnnouncementsFromDb,
    createAnnouncement as createAnnouncementInDb,
    deleteAnnouncement as deleteAnnouncementInDb,
    toggleAnnouncementPin as toggleAnnouncementPinInDb,
    // Crew Events
    getCrewEvents as getCrewEventsFromDb,
    addCrewEvent as addCrewEventInDb,
    // Types
    type Crew as DbCrew,
    type CrewMember as DbCrewMember,
    type CrewJoinRequest as DbCrewJoinRequest,
    type CrewAnnouncement as DbCrewAnnouncement,
    type CrewEvent as DbCrewEvent,
} from "./supabase/queries";

/** 크루 행사 (출처 정보 포함) */
export interface CrewEventWithSource {
    crewId: string;
    eventId: string;
    /** 출처: explicit = 명시적 등록, attended = 멤버 다녀옴 자동 */
    source: "explicit" | "attended";
    /** 추가/다녀온 사람 ID */
    userId: string;
    /** 추가/다녀온 사람 닉네임 */
    userNickname: string;
    /** 날짜 */
    date: Date;
    /** 다녀온 멤버 수 (attended인 경우) */
    attendedCount?: number;
}

// ===== Mock 데이터 =====

export const MOCK_CREWS: Crew[] = [
    {
        id: "crew1",
        name: "록페스 패밀리",
        description: "매년 지산, 펜타포트 함께 가는 록 페스티벌 크루입니다! 신규 멤버 환영해요 🤘",
        region: "전국",
        genre: "rock",
        isPublic: true,
        joinType: "approval",
        maxMembers: 20,
        createdBy: "user2",
        createdAt: new Date("2024-03-15"),
        logoEmoji: "🎸",
    },
    {
        id: "crew2",
        name: "인디씬 크루",
        description: "홍대 인디 공연 같이 다녀요. 소규모 공연 위주로 활동합니다.",
        region: "서울",
        genre: "indie",
        isPublic: true,
        joinType: "open",
        maxMembers: 15,
        createdBy: "user3",
        createdAt: new Date("2024-06-01"),
        logoEmoji: "🎤",
    },
    {
        id: "crew3",
        name: "콘서트 투어러스",
        description: "K-POP 콘서트 전국투어 다니는 크루! 서울/부산/대구 어디든 갑니다.",
        region: "전국",
        genre: "kpop",
        isPublic: true,
        joinType: "approval",
        maxMembers: 30,
        createdBy: "user4",
        createdAt: new Date("2024-01-20"),
        logoEmoji: "👯",
    },
    {
        id: "crew4",
        name: "재즈 나이트",
        description: "재즈 클럽, 재즈 페스티벌 함께 즐겨요. 초보자도 환영!",
        region: "서울",
        genre: "jazz",
        isPublic: true,
        joinType: "open",
        maxMembers: 10,
        createdBy: "user5",
        createdAt: new Date("2024-08-10"),
        logoEmoji: "🎷",
    },
    {
        id: "crew5",
        name: "EDM 파티 크루",
        description: "울트라, 월드 DJ 페스티벌 같이 가실 분! 클럽 파티도 종종 가요.",
        region: "서울",
        genre: "edm",
        isPublic: false,
        joinType: "approval",
        maxMembers: 25,
        createdBy: "user6",
        createdAt: new Date("2024-04-05"),
        logoEmoji: "🔥",
    },
];

export const MOCK_CREW_MEMBERS: CrewMember[] = [
    // 록페스 패밀리 (8명 - 대규모 크루 테스트용)
    { crewId: "crew1", userId: "user2", userNickname: "록페스러버", role: "leader", joinedAt: new Date("2024-03-15") },
    { crewId: "crew1", userId: "user1", userNickname: "페스티벌러", role: "member", joinedAt: new Date("2024-04-01") },
    { crewId: "crew1", userId: "user7", userNickname: "기타치는곰", role: "member", joinedAt: new Date("2024-05-10") },
    { crewId: "crew1", userId: "user8", userNickname: "드러머킴", role: "member", joinedAt: new Date("2024-06-15") },
    { crewId: "crew1", userId: "user9", userNickname: "베이시스트", role: "member", joinedAt: new Date("2024-07-01") },
    { crewId: "crew1", userId: "user10", userNickname: "보컬리스트", role: "member", joinedAt: new Date("2024-07-15") },
    { crewId: "crew1", userId: "user11", userNickname: "키보디스트", role: "member", joinedAt: new Date("2024-08-01") },
    { crewId: "crew1", userId: "user12", userNickname: "퍼커셔니스트", role: "member", joinedAt: new Date("2024-08-15") },
    // 인디씬 크루 (3명)
    { crewId: "crew2", userId: "user3", userNickname: "인디키드", role: "leader", joinedAt: new Date("2024-06-01") },
    { crewId: "crew2", userId: "user1", userNickname: "페스티벌러", role: "member", joinedAt: new Date("2024-07-01") },
    { crewId: "crew2", userId: "user5", userNickname: "재즈매니아", role: "member", joinedAt: new Date("2024-08-01") },
    // 콘서트 투어러스 (2명)
    { crewId: "crew3", userId: "user4", userNickname: "투어러", role: "leader", joinedAt: new Date("2024-01-20") },
    { crewId: "crew3", userId: "user6", userNickname: "DJ마스터", role: "member", joinedAt: new Date("2024-02-15") },
    // 재즈 나이트 (2명)
    { crewId: "crew4", userId: "user5", userNickname: "재즈매니아", role: "leader", joinedAt: new Date("2024-08-10") },
    { crewId: "crew4", userId: "user3", userNickname: "인디키드", role: "member", joinedAt: new Date("2024-09-01") },
    // EDM 파티 크루 (2명)
    { crewId: "crew5", userId: "user6", userNickname: "DJ마스터", role: "leader", joinedAt: new Date("2024-04-05") },
    { crewId: "crew5", userId: "user4", userNickname: "투어러", role: "member", joinedAt: new Date("2024-05-01") },
];

export const MOCK_CREW_EVENTS: CrewEvent[] = [
    // 록페스 패밀리 관심 행사
    { crewId: "crew1", eventId: "e2", addedBy: "user1", addedAt: new Date("2025-01-10") },
    { crewId: "crew1", eventId: "55948", addedBy: "user2", addedAt: new Date("2025-01-05") },
    // 인디씬 크루 관심 행사
    { crewId: "crew2", eventId: "55948", addedBy: "user3", addedAt: new Date("2025-01-08") },
    // 콘서트 투어러스 관심 행사
    { crewId: "crew3", eventId: "e2", addedBy: "user4", addedAt: new Date("2025-01-12") },
];

export const MOCK_JOIN_REQUESTS: CrewJoinRequest[] = [
    // 록페스 패밀리 가입 신청
    {
        id: "req1",
        crewId: "crew1",
        userId: "user14",
        userNickname: "메탈헤드",
        message: "록 페스티벌 좋아해요! 같이 다니고 싶습니다 🎸",
        requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
        status: "pending",
    },
    {
        id: "req2",
        crewId: "crew1",
        userId: "user15",
        userNickname: "베이시스트",
        message: "록 음악 좋아하는 20대입니다",
        requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전
        status: "pending",
    },
    // 콘서트 투어러스 가입 신청
    {
        id: "req3",
        crewId: "crew3",
        userId: "user16",
        userNickname: "케이팝팬",
        message: "콘서트 전국투어 같이 가고 싶어요!",
        requestedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12시간 전
        status: "pending",
    },
];

export const MOCK_ANNOUNCEMENTS: CrewAnnouncement[] = [
    {
        id: "ann1",
        crewId: "crew1",
        authorId: "user2",
        authorNickname: "록페스러버",
        content: "🎸 펜타포트 2025 조기예매 시작! 7월 25-27일 개최 확정되었습니다. 다같이 가실 분들 댓글 남겨주세요!",
        isPinned: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
        id: "ann2",
        crewId: "crew1",
        authorId: "user2",
        authorNickname: "록페스러버",
        content: "이번 주 토요일(12/21) 홍대 클럽 공연 번개 있습니다! 참여 원하시면 연락주세요 📞",
        isPinned: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
];

export const MOCK_CREW_ACTIVITIES: CrewActivity[] = [
    // 록페스 패밀리 활동
    {
        id: "act1",
        crewId: "crew1",
        userId: "user1",
        userNickname: "페스티벌러",
        type: "wishlist",
        eventId: "e2",
        eventTitle: "인천 펜타포트 락 페스티벌 2025",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    },
    {
        id: "act2",
        crewId: "crew1",
        userId: "user7",
        userNickname: "기타치는곰",
        type: "attended",
        eventId: "24016943",
        eventTitle: "현대카드 슈퍼콘서트 27 OASIS",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 어제
    },
    {
        id: "act3",
        crewId: "crew1",
        userId: "user8",
        userNickname: "드러머킴",
        type: "review",
        eventId: "24016943",
        eventTitle: "현대카드 슈퍼콘서트 27 OASIS",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2일 전
        content: "역대급 공연이었어요!",
    },
    // 인디씬 크루 활동
    {
        id: "act4",
        crewId: "crew2",
        userId: "user1",
        userNickname: "페스티벌러",
        type: "wishlist",
        eventId: "55948",
        eventTitle: "2025 기생충 콘서트",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
        id: "act5",
        crewId: "crew2",
        userId: "user9",
        userNickname: "홍대스타",
        type: "join",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1주일 전
    },
];

// ===== Context =====

interface CrewContextValue {
    /** 모든 크루 목록 (공개) */
    allCrews: Crew[];
    /** 내가 속한 크루 목록 */
    myCrews: Crew[];
    /** 특정 크루 조회 */
    getCrew: (crewId: string) => Crew | undefined;
    /** 크루 멤버 조회 */
    getCrewMembers: (crewId: string) => CrewMember[];
    /** 크루 활동 피드 조회 */
    getCrewActivities: (crewId: string) => CrewActivity[];
    /** 크루 통계 */
    getCrewStats: (crewId: string) => CrewStats;
    /** 크루 행사 조회 (명시적 등록 + 멤버 다녀옴 자동 연동) */
    getCrewEvents: (crewId: string) => CrewEventWithSource[];
    /** 크루에 행사 추가 */
    addCrewEvent: (crewId: string, eventId: string) => void;
    /** 크루 생성 */
    createCrew: (input: CreateCrewInput) => Crew;
    /** 크루 가입 (open 타입) */
    joinCrew: (crewId: string) => void;
    /** 크루 탈퇴 */
    leaveCrew: (crewId: string) => void;
    /** 크루 멤버 여부 확인 */
    isMember: (crewId: string) => boolean;
    /** 크루장 여부 확인 */
    isLeader: (crewId: string) => boolean;
    /** 현재 사용자와 특정 사용자가 같은 크루에 속해 있는지 확인 */
    sharesCrew: (targetUserId: string) => boolean;
    /** 현재 사용자 ID */
    currentUserId: string;

    // ===== 가입 신청 관련 =====
    /** 가입 신청 (approval 타입) */
    requestJoinCrew: (crewId: string, message?: string) => void;
    /** 가입 신청 목록 조회 (크루장용) */
    getJoinRequests: (crewId: string) => CrewJoinRequest[];
    /** 가입 신청 승인 (크루장용) */
    approveJoinRequest: (requestId: string) => void;
    /** 가입 신청 거절 (크루장용) */
    rejectJoinRequest: (requestId: string) => void;
    /** 가입 신청 여부 확인 */
    hasJoinRequest: (crewId: string) => boolean;
    /** 대기 중인 가입 신청 수 */
    getPendingRequestCount: (crewId: string) => number;

    // ===== 멤버 관리 (크루장용) =====
    /** 멤버 강퇴 */
    kickMember: (crewId: string, userId: string) => void;

    // ===== 공지 관련 =====
    /** 공지 목록 조회 */
    getAnnouncements: (crewId: string) => CrewAnnouncement[];
    /** 공지 작성 (크루장용) */
    createAnnouncement: (crewId: string, content: string, isPinned?: boolean) => void;
    /** 공지 삭제 (크루장용) */
    deleteAnnouncement: (announcementId: string) => void;
    /** 공지 고정/해제 (크루장용) */
    toggleAnnouncementPin: (announcementId: string) => void;

    /** 데이터 소스 표시 */
    isFromSupabase: boolean;
    /** 로딩 상태 */
    isLoading: boolean;
}

const CrewContext = createContext<CrewContextValue | null>(null);

// Storage adapters (전역 공유 데이터) - Dev 모드용
const crewsAdapter = createSharedAdapter<Crew[]>({
    domain: DOMAINS.CREWS,
    dateFields: ["createdAt"],
});
const membersAdapter = createSharedAdapter<CrewMember[]>({
    domain: DOMAINS.CREW_MEMBERS,
    dateFields: ["joinedAt"],
});
const activitiesAdapter = createSharedAdapter<CrewActivity[]>({
    domain: DOMAINS.CREW_ACTIVITIES,
    dateFields: ["createdAt"],
});
const crewEventsAdapter = createSharedAdapter<CrewEvent[]>({
    domain: DOMAINS.CREW_EVENTS,
    dateFields: ["addedAt"],
});
const joinRequestsAdapter = createSharedAdapter<CrewJoinRequest[]>({
    domain: DOMAINS.CREW_JOIN_REQUESTS,
    dateFields: ["requestedAt", "processedAt"],
});
const announcementsAdapter = createSharedAdapter<CrewAnnouncement[]>({
    domain: DOMAINS.CREW_ANNOUNCEMENTS,
    dateFields: ["createdAt", "updatedAt"],
});

// 사용자 닉네임 조회 헬퍼
const getUserNickname = (userId: string): string => {
    const user = MOCK_USERS.find(u => u.id === userId);
    return user?.nickname || "익명";
};

// DB 타입을 Frontend 타입으로 변환하는 헬퍼
function transformDbCrewToFrontend(dbCrew: DbCrew): Crew {
    return {
        id: dbCrew.id,
        name: dbCrew.name,
        description: dbCrew.description || "",
        region: dbCrew.region as CrewRegion,
        genre: dbCrew.genre as CrewGenre,
        isPublic: dbCrew.isPublic,
        joinType: dbCrew.joinType,
        maxMembers: dbCrew.maxMembers,
        logoEmoji: dbCrew.logoEmoji || undefined,
        logoUrl: dbCrew.logoUrl || undefined,
        bannerUrl: dbCrew.bannerUrl || undefined,
        createdBy: dbCrew.createdBy,
        createdAt: dbCrew.createdAt,
    };
}

function transformDbMemberToFrontend(dbMember: DbCrewMember, nickname?: string): CrewMember {
    return {
        crewId: dbMember.crewId,
        userId: dbMember.userId,
        userNickname: nickname || "사용자",
        role: dbMember.role,
        joinedAt: dbMember.joinedAt,
    };
}

function transformDbAnnouncementToFrontend(dbAnn: DbCrewAnnouncement, nickname?: string): CrewAnnouncement {
    return {
        id: dbAnn.id,
        crewId: dbAnn.crewId,
        authorId: dbAnn.authorId,
        authorNickname: nickname || "관리자",
        content: dbAnn.content,
        isPinned: dbAnn.isPinned,
        createdAt: dbAnn.createdAt,
        updatedAt: dbAnn.updatedAt,
    };
}

export function CrewProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId && isValidUUID(realUserId);

    // Dev 모드에서 mockUserId 사용 (Dev 모드 로그인 상태일 때만)
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    // 로그아웃 상태에서는 null이어야 함
    const currentUserId = realUserId || devUserId || "";
    const currentUserNickname = getUserNickname(currentUserId);

    const [crews, setCrews] = useState<Crew[]>(MOCK_CREWS);
    const [members, setMembers] = useState<CrewMember[]>(MOCK_CREW_MEMBERS);
    const [activities, setActivities] = useState<CrewActivity[]>(MOCK_CREW_ACTIVITIES);
    const [crewEvents, setCrewEvents] = useState<CrewEvent[]>(MOCK_CREW_EVENTS);
    const [joinRequests, setJoinRequests] = useState<CrewJoinRequest[]>(MOCK_JOIN_REQUESTS);
    const [announcements, setAnnouncements] = useState<CrewAnnouncement[]>(MOCK_ANNOUNCEMENTS);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

    // 사용자 변경 또는 초기 로드 시 데이터 로드
    useEffect(() => {
        if (loadedUserId === currentUserId) return;

        // 실제 사용자: Supabase에서 로드
        if (isRealUser && realUserId) {
            setIsLoading(true);
            Promise.all([
                getPublicCrewsFromDb(),
                getUserCrewsFromDb(realUserId),
            ])
                .then(async ([publicCrews, userCrews]) => {
                    // 중복 제거하여 병합
                    const allCrewsMap = new Map<string, Crew>();
                    [...publicCrews, ...userCrews].forEach(c => {
                        allCrewsMap.set(c.id, transformDbCrewToFrontend(c));
                    });
                    setCrews(Array.from(allCrewsMap.values()));

                    // 사용자가 속한 크루의 멤버 목록 로드
                    const memberPromises = userCrews.map(c => getCrewMembersFromDb(c.id));
                    const memberResults = await Promise.all(memberPromises);
                    const allMembers = memberResults.flat().map(m => transformDbMemberToFrontend(m));
                    setMembers(allMembers);

                    setIsFromSupabase(true);
                })
                .catch((error) => {
                    console.error("[CrewContext] Supabase load failed:", error);
                    // 폴백: localStorage에서 로드
                    loadFromLocalStorage();
                    setIsFromSupabase(false);
                })
                .finally(() => {
                    setIsLoading(false);
                    setLoadedUserId(currentUserId);
                });
            return;
        }

        // Dev 모드: localStorage에서 로드
        loadFromLocalStorage();
        setLoadedUserId(currentUserId);
        setIsFromSupabase(false);
    }, [currentUserId, loadedUserId, isRealUser, realUserId]);

    // localStorage에서 데이터 로드 (Dev 모드용)
    const loadFromLocalStorage = () => {
        const storedCrews = crewsAdapter.get();
        if (storedCrews) setCrews(storedCrews);

        const storedMembers = membersAdapter.get();
        if (storedMembers) setMembers(storedMembers);

        const storedActivities = activitiesAdapter.get();
        if (storedActivities) setActivities(storedActivities);

        const storedCrewEvents = crewEventsAdapter.get();
        if (storedCrewEvents) setCrewEvents(storedCrewEvents);

        const storedJoinRequests = joinRequestsAdapter.get();
        if (storedJoinRequests) setJoinRequests(storedJoinRequests);

        const storedAnnouncements = announcementsAdapter.get();
        if (storedAnnouncements) setAnnouncements(storedAnnouncements);
    };

    // localStorage에 저장 (Dev 모드만)
    useEffect(() => {
        if (isRealUser || loadedUserId !== currentUserId) return;
        crewsAdapter.set(crews);
        membersAdapter.set(members);
        activitiesAdapter.set(activities);
        crewEventsAdapter.set(crewEvents);
        joinRequestsAdapter.set(joinRequests);
        announcementsAdapter.set(announcements);
    }, [crews, members, activities, crewEvents, joinRequests, announcements, isRealUser, loadedUserId, currentUserId]);

    // 공개 크루 목록
    const allCrews = useMemo(() => {
        return crews.filter(c => c.isPublic);
    }, [crews]);

    // 내가 속한 크루 목록
    const myCrews = useMemo(() => {
        const myCrewIds = members
            .filter(m => m.userId === currentUserId)
            .map(m => m.crewId);
        return crews.filter(c => myCrewIds.includes(c.id));
    }, [crews, members, currentUserId]);

    // 특정 크루 조회
    const getCrew = useCallback((crewId: string) => {
        return crews.find(c => c.id === crewId);
    }, [crews]);

    // 크루 멤버 조회
    const getCrewMembersFn = useCallback((crewId: string) => {
        return members.filter(m => m.crewId === crewId);
    }, [members]);

    // 크루 활동 피드 조회
    const getCrewActivities = useCallback((crewId: string) => {
        return activities
            .filter(a => a.crewId === crewId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activities]);

    // 크루 통계
    const getCrewStats = useCallback((crewId: string): CrewStats => {
        const crewMembers = members.filter(m => m.crewId === crewId);
        const crewActivities = activities.filter(a => a.crewId === crewId);
        const eventIds = new Set(crewActivities.filter(a => a.eventId).map(a => a.eventId));
        const attendedCount = crewActivities.filter(a => a.type === "attended").length;

        return {
            memberCount: crewMembers.length,
            eventCount: eventIds.size,
            totalAttendance: attendedCount,
        };
    }, [members, activities]);

    // 크루 행사 조회 (명시적 등록 + 멤버 다녀옴 자동 연동)
    const getCrewEventsFn = useCallback((crewId: string): CrewEventWithSource[] => {
        const result: CrewEventWithSource[] = [];
        const seenEventIds = new Set<string>();

        // 1. 명시적으로 등록된 행사
        crewEvents
            .filter(e => e.crewId === crewId)
            .forEach(e => {
                seenEventIds.add(e.eventId);
                result.push({
                    crewId: e.crewId,
                    eventId: e.eventId,
                    source: "explicit",
                    userId: e.addedBy,
                    userNickname: members.find(m => m.userId === e.addedBy)?.userNickname || "알 수 없음",
                    date: e.addedAt,
                });
            });

        // 2. 멤버들이 다녀온 행사 (attended 활동에서 추출)
        const attendedActivities = activities.filter(
            a => a.crewId === crewId && a.type === "attended" && a.eventId
        );

        // 행사별로 그룹화하여 다녀온 멤버 수 계산
        const attendedByEvent = new Map<string, { activities: typeof attendedActivities; count: number }>();
        attendedActivities.forEach(a => {
            if (!a.eventId) return;
            const existing = attendedByEvent.get(a.eventId);
            if (existing) {
                existing.activities.push(a);
                existing.count++;
            } else {
                attendedByEvent.set(a.eventId, { activities: [a], count: 1 });
            }
        });

        // 명시적 등록되지 않은 다녀온 행사 추가
        attendedByEvent.forEach((data, eventId) => {
            if (!seenEventIds.has(eventId)) {
                const firstActivity = data.activities[0];
                result.push({
                    crewId,
                    eventId,
                    source: "attended",
                    userId: firstActivity.userId,
                    userNickname: firstActivity.userNickname,
                    date: firstActivity.createdAt,
                    attendedCount: data.count,
                });
            }
        });

        // 최신순 정렬
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [crewEvents, activities, members]);

    // 크루에 행사 추가
    const addCrewEventFn = useCallback((crewId: string, eventId: string) => {
        // 이미 등록된 행사인지 확인
        const exists = crewEvents.some(e => e.crewId === crewId && e.eventId === eventId);
        if (exists) return;

        const newEvent: CrewEvent = {
            crewId,
            eventId,
            addedBy: currentUserId,
            addedAt: new Date(),
        };

        // Optimistic update
        setCrewEvents(prev => [...prev, newEvent]);

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(crewId) && isValidUUID(eventId)) {
            addCrewEventInDb(crewId, eventId, realUserId).catch((error) => {
                console.error("[CrewContext] addCrewEvent failed:", error);
                // 롤백
                setCrewEvents(prev => prev.filter(e => !(e.crewId === crewId && e.eventId === eventId)));
            });
        }
    }, [crewEvents, currentUserId, isRealUser, realUserId]);

    // 크루 생성
    const createCrewFn = useCallback((input: CreateCrewInput): Crew => {
        // 실제 사용자: Supabase에 생성 (비동기, 임시 ID 반환)
        if (isRealUser && realUserId) {
            const tempId = `crew_temp_${Date.now()}`;
            const tempCrew: Crew = {
                id: tempId,
                ...input,
                createdBy: currentUserId,
                createdAt: new Date(),
            };

            // Optimistic update
            setCrews(prev => [...prev, tempCrew]);

            createCrewInDb(realUserId, input)
                .then((dbCrew) => {
                    // 실제 크루로 교체
                    setCrews(prev => prev.map(c =>
                        c.id === tempId ? transformDbCrewToFrontend(dbCrew) : c
                    ));
                    // 멤버 추가 (리더)
                    setMembers(prev => [...prev, {
                        crewId: dbCrew.id,
                        userId: realUserId,
                        userNickname: currentUserNickname,
                        role: "leader",
                        joinedAt: new Date(),
                    }]);
                })
                .catch((error) => {
                    console.error("[CrewContext] createCrew failed:", error);
                    // 롤백
                    setCrews(prev => prev.filter(c => c.id !== tempId));
                });

            return tempCrew;
        }

        // Dev 모드: localStorage에 저장
        const newCrew: Crew = {
            id: `crew_${Date.now()}`,
            ...input,
            createdBy: currentUserId,
            createdAt: new Date(),
        };

        // 생성자를 리더로 추가
        const leaderMember: CrewMember = {
            crewId: newCrew.id,
            userId: currentUserId,
            userNickname: currentUserNickname,
            role: "leader",
            joinedAt: new Date(),
        };

        setCrews(prev => [...prev, newCrew]);
        setMembers(prev => [...prev, leaderMember]);

        // 활동 기록
        const activity: CrewActivity = {
            id: `act_${Date.now()}`,
            crewId: newCrew.id,
            userId: currentUserId,
            userNickname: currentUserNickname,
            type: "join",
            createdAt: new Date(),
        };
        setActivities(prev => [...prev, activity]);

        return newCrew;
    }, [currentUserId, currentUserNickname, isRealUser, realUserId]);

    // 크루 가입
    const joinCrewFn = useCallback((crewId: string) => {
        const crew = crews.find(c => c.id === crewId);
        if (!crew) return;

        // 이미 멤버인지 확인
        const alreadyMember = members.some(
            m => m.crewId === crewId && m.userId === currentUserId
        );
        if (alreadyMember) return;

        // 최대 인원 확인
        const currentMembers = members.filter(m => m.crewId === crewId);
        if (currentMembers.length >= crew.maxMembers) return;

        // 멤버 추가
        const newMember: CrewMember = {
            crewId,
            userId: currentUserId,
            userNickname: currentUserNickname,
            role: "member",
            joinedAt: new Date(),
        };

        // Optimistic update
        setMembers(prev => [...prev, newMember]);

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(crewId)) {
            joinCrewInDb(crewId, realUserId).catch((error) => {
                console.error("[CrewContext] joinCrew failed:", error);
                // 롤백
                setMembers(prev => prev.filter(
                    m => !(m.crewId === crewId && m.userId === currentUserId)
                ));
            });
        }

        // 활동 기록 (Dev 모드만)
        if (!isRealUser) {
            const activity: CrewActivity = {
                id: `act_${Date.now()}`,
                crewId,
                userId: currentUserId,
                userNickname: currentUserNickname,
                type: "join",
                createdAt: new Date(),
            };
            setActivities(prev => [...prev, activity]);
        }
    }, [crews, members, currentUserId, currentUserNickname, isRealUser, realUserId]);

    // 크루 탈퇴
    const leaveCrewFn = useCallback((crewId: string) => {
        // 리더는 탈퇴 불가 (해체만 가능)
        const memberInfo = members.find(
            m => m.crewId === crewId && m.userId === currentUserId
        );
        if (!memberInfo || memberInfo.role === "leader") return;

        // Optimistic update
        setMembers(prev => prev.filter(
            m => !(m.crewId === crewId && m.userId === currentUserId)
        ));

        // 실제 사용자: Supabase에서 삭제
        if (isRealUser && realUserId && isValidUUID(crewId)) {
            leaveCrewInDb(crewId, realUserId).catch((error) => {
                console.error("[CrewContext] leaveCrew failed:", error);
                // 롤백
                setMembers(prev => [...prev, memberInfo]);
            });
        }

        // 활동 기록 (Dev 모드만)
        if (!isRealUser) {
            const activity: CrewActivity = {
                id: `act_${Date.now()}`,
                crewId,
                userId: currentUserId,
                userNickname: currentUserNickname,
                type: "leave",
                createdAt: new Date(),
            };
            setActivities(prev => [...prev, activity]);
        }
    }, [members, currentUserId, currentUserNickname, isRealUser, realUserId]);

    // 멤버 여부 확인
    const isMember = useCallback((crewId: string) => {
        return members.some(m => m.crewId === crewId && m.userId === currentUserId);
    }, [members, currentUserId]);

    // 리더 여부 확인
    const isLeader = useCallback((crewId: string) => {
        return members.some(
            m => m.crewId === crewId && m.userId === currentUserId && m.role === "leader"
        );
    }, [members, currentUserId]);

    // 현재 사용자와 특정 사용자가 같은 크루에 속해 있는지 확인
    const sharesCrew = useCallback((targetUserId: string): boolean => {
        if (!currentUserId || currentUserId === targetUserId) return false;

        // 현재 사용자가 속한 크루 목록
        const myCrewIds = members
            .filter(m => m.userId === currentUserId)
            .map(m => m.crewId);

        // 대상 사용자가 속한 크루 중 현재 사용자도 속한 크루가 있는지 확인
        return members.some(
            m => m.userId === targetUserId && myCrewIds.includes(m.crewId)
        );
    }, [members, currentUserId]);

    // ===== 가입 신청 관련 =====

    // 가입 신청 (approval 타입)
    const requestJoinCrewFn = useCallback((crewId: string, message?: string) => {
        const crew = crews.find(c => c.id === crewId);
        if (!crew || crew.joinType !== "approval") return;

        // 이미 멤버인지 확인
        if (members.some(m => m.crewId === crewId && m.userId === currentUserId)) return;

        // 이미 신청했는지 확인
        if (joinRequests.some(r => r.crewId === crewId && r.userId === currentUserId && r.status === "pending")) return;

        const newRequest: CrewJoinRequest = {
            id: `req_${Date.now()}`,
            crewId,
            userId: currentUserId,
            userNickname: currentUserNickname,
            message,
            requestedAt: new Date(),
            status: "pending",
        };

        // Optimistic update
        setJoinRequests(prev => [...prev, newRequest]);

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(crewId)) {
            requestJoinCrewInDb(crewId, realUserId, message).catch((error) => {
                console.error("[CrewContext] requestJoinCrew failed:", error);
                // 롤백
                setJoinRequests(prev => prev.filter(r => r.id !== newRequest.id));
            });
        }
    }, [crews, members, joinRequests, currentUserId, currentUserNickname, isRealUser, realUserId]);

    // 가입 신청 목록 조회 (크루장용)
    const getJoinRequestsFn = useCallback((crewId: string): CrewJoinRequest[] => {
        return joinRequests
            .filter(r => r.crewId === crewId)
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [joinRequests]);

    // 가입 신청 승인 (크루장용)
    const approveJoinRequestFn = useCallback((requestId: string) => {
        const request = joinRequests.find(r => r.id === requestId);
        if (!request || request.status !== "pending") return;

        // 크루장인지 확인
        if (!members.some(m => m.crewId === request.crewId && m.userId === currentUserId && m.role === "leader")) return;

        // Optimistic update: 신청 상태 업데이트
        setJoinRequests(prev => prev.map(r =>
            r.id === requestId
                ? { ...r, status: "approved" as const, processedAt: new Date(), processedBy: currentUserId }
                : r
        ));

        // Optimistic update: 멤버로 추가
        const newMember: CrewMember = {
            crewId: request.crewId,
            userId: request.userId,
            userNickname: request.userNickname,
            userAvatar: request.userAvatar,
            role: "member",
            joinedAt: new Date(),
        };
        setMembers(prev => [...prev, newMember]);

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(requestId)) {
            approveJoinRequestInDb(requestId, realUserId).catch((error) => {
                console.error("[CrewContext] approveJoinRequest failed:", error);
                // 롤백
                setJoinRequests(prev => prev.map(r =>
                    r.id === requestId ? { ...r, status: "pending" as const, processedAt: undefined, processedBy: undefined } : r
                ));
                setMembers(prev => prev.filter(
                    m => !(m.crewId === request.crewId && m.userId === request.userId)
                ));
            });
        }

        // 활동 기록 (Dev 모드만)
        if (!isRealUser) {
            const activity: CrewActivity = {
                id: `act_${Date.now()}`,
                crewId: request.crewId,
                userId: request.userId,
                userNickname: request.userNickname,
                type: "join",
                createdAt: new Date(),
            };
            setActivities(prev => [...prev, activity]);
        }
    }, [joinRequests, members, currentUserId, isRealUser, realUserId]);

    // 가입 신청 거절 (크루장용)
    const rejectJoinRequestFn = useCallback((requestId: string) => {
        const request = joinRequests.find(r => r.id === requestId);
        if (!request || request.status !== "pending") return;

        // 크루장인지 확인
        if (!members.some(m => m.crewId === request.crewId && m.userId === currentUserId && m.role === "leader")) return;

        // Optimistic update
        setJoinRequests(prev => prev.map(r =>
            r.id === requestId
                ? { ...r, status: "rejected" as const, processedAt: new Date(), processedBy: currentUserId }
                : r
        ));

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(requestId)) {
            rejectJoinRequestInDb(requestId, realUserId).catch((error) => {
                console.error("[CrewContext] rejectJoinRequest failed:", error);
                // 롤백
                setJoinRequests(prev => prev.map(r =>
                    r.id === requestId ? { ...r, status: "pending" as const, processedAt: undefined, processedBy: undefined } : r
                ));
            });
        }
    }, [joinRequests, members, currentUserId, isRealUser, realUserId]);

    // 가입 신청 여부 확인
    const hasJoinRequestFn = useCallback((crewId: string): boolean => {
        return joinRequests.some(
            r => r.crewId === crewId && r.userId === currentUserId && r.status === "pending"
        );
    }, [joinRequests, currentUserId]);

    // 대기 중인 가입 신청 수
    const getPendingRequestCountFn = useCallback((crewId: string): number => {
        return joinRequests.filter(r => r.crewId === crewId && r.status === "pending").length;
    }, [joinRequests]);

    // ===== 멤버 관리 (크루장용) =====

    // 멤버 강퇴
    const kickMemberFn = useCallback((crewId: string, userId: string) => {
        // 크루장인지 확인
        if (!members.some(m => m.crewId === crewId && m.userId === currentUserId && m.role === "leader")) return;

        // 자기 자신은 강퇴 불가
        if (userId === currentUserId) return;

        // 강퇴할 대상이 멤버인지 확인
        const targetMember = members.find(m => m.crewId === crewId && m.userId === userId);
        if (!targetMember) return;

        // Optimistic update
        setMembers(prev => prev.filter(m => !(m.crewId === crewId && m.userId === userId)));

        // 실제 사용자: Supabase에서 삭제
        if (isRealUser && realUserId && isValidUUID(crewId) && isValidUUID(userId)) {
            kickMemberInDb(crewId, userId).catch((error) => {
                console.error("[CrewContext] kickMember failed:", error);
                // 롤백
                setMembers(prev => [...prev, targetMember]);
            });
        }

        // 활동 기록 (Dev 모드만)
        if (!isRealUser) {
            const activity: CrewActivity = {
                id: `act_${Date.now()}`,
                crewId,
                userId,
                userNickname: targetMember.userNickname,
                type: "leave",
                createdAt: new Date(),
            };
            setActivities(prev => [...prev, activity]);
        }
    }, [members, currentUserId, isRealUser, realUserId]);

    // ===== 공지 관련 =====

    // 공지 목록 조회
    const getAnnouncementsFn = useCallback((crewId: string): CrewAnnouncement[] => {
        return announcements
            .filter(a => a.crewId === crewId)
            .sort((a, b) => {
                // 고정 공지 먼저, 그 다음 최신순
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [announcements]);

    // 공지 작성 (크루장용)
    const createAnnouncementFn = useCallback((crewId: string, content: string, isPinned: boolean = false) => {
        // 크루장인지 확인
        const leaderMember = members.find(m => m.crewId === crewId && m.userId === currentUserId && m.role === "leader");
        if (!leaderMember) return;

        const newAnnouncement: CrewAnnouncement = {
            id: `ann_${Date.now()}`,
            crewId,
            authorId: currentUserId,
            authorNickname: leaderMember.userNickname,
            content,
            isPinned,
            createdAt: new Date(),
        };

        // Optimistic update
        setAnnouncements(prev => [...prev, newAnnouncement]);

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(crewId)) {
            createAnnouncementInDb(crewId, realUserId, content, isPinned)
                .then((dbAnn) => {
                    // 실제 공지로 교체
                    setAnnouncements(prev => prev.map(a =>
                        a.id === newAnnouncement.id
                            ? transformDbAnnouncementToFrontend(dbAnn, leaderMember.userNickname)
                            : a
                    ));
                })
                .catch((error) => {
                    console.error("[CrewContext] createAnnouncement failed:", error);
                    // 롤백
                    setAnnouncements(prev => prev.filter(a => a.id !== newAnnouncement.id));
                });
        }
    }, [members, currentUserId, isRealUser, realUserId]);

    // 공지 삭제 (크루장용)
    const deleteAnnouncementFn = useCallback((announcementId: string) => {
        const announcement = announcements.find(a => a.id === announcementId);
        if (!announcement) return;

        // 크루장인지 확인
        if (!members.some(m => m.crewId === announcement.crewId && m.userId === currentUserId && m.role === "leader")) return;

        // Optimistic update
        setAnnouncements(prev => prev.filter(a => a.id !== announcementId));

        // 실제 사용자: Supabase에서 삭제
        if (isRealUser && realUserId && isValidUUID(announcementId)) {
            deleteAnnouncementInDb(announcementId).catch((error) => {
                console.error("[CrewContext] deleteAnnouncement failed:", error);
                // 롤백
                setAnnouncements(prev => [...prev, announcement]);
            });
        }
    }, [announcements, members, currentUserId, isRealUser, realUserId]);

    // 공지 고정/해제 (크루장용)
    const toggleAnnouncementPinFn = useCallback((announcementId: string) => {
        const announcement = announcements.find(a => a.id === announcementId);
        if (!announcement) return;

        // 크루장인지 확인
        if (!members.some(m => m.crewId === announcement.crewId && m.userId === currentUserId && m.role === "leader")) return;

        const newIsPinned = !announcement.isPinned;

        // Optimistic update
        setAnnouncements(prev => prev.map(a =>
            a.id === announcementId
                ? { ...a, isPinned: newIsPinned, updatedAt: new Date() }
                : a
        ));

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(announcementId)) {
            toggleAnnouncementPinInDb(announcementId, newIsPinned).catch((error) => {
                console.error("[CrewContext] toggleAnnouncementPin failed:", error);
                // 롤백
                setAnnouncements(prev => prev.map(a =>
                    a.id === announcementId ? { ...a, isPinned: announcement.isPinned } : a
                ));
            });
        }
    }, [announcements, members, currentUserId, isRealUser, realUserId]);

    return (
        <CrewContext.Provider
            value={{
                allCrews,
                myCrews,
                getCrew,
                getCrewMembers: getCrewMembersFn,
                getCrewActivities,
                getCrewStats,
                getCrewEvents: getCrewEventsFn,
                addCrewEvent: addCrewEventFn,
                createCrew: createCrewFn,
                joinCrew: joinCrewFn,
                leaveCrew: leaveCrewFn,
                isMember,
                isLeader,
                sharesCrew,
                currentUserId,
                // 가입 신청 관련
                requestJoinCrew: requestJoinCrewFn,
                getJoinRequests: getJoinRequestsFn,
                approveJoinRequest: approveJoinRequestFn,
                rejectJoinRequest: rejectJoinRequestFn,
                hasJoinRequest: hasJoinRequestFn,
                getPendingRequestCount: getPendingRequestCountFn,
                // 멤버 관리
                kickMember: kickMemberFn,
                // 공지 관련
                getAnnouncements: getAnnouncementsFn,
                createAnnouncement: createAnnouncementFn,
                deleteAnnouncement: deleteAnnouncementFn,
                toggleAnnouncementPin: toggleAnnouncementPinFn,
                // 상태
                isFromSupabase,
                isLoading,
            }}
        >
            {children}
        </CrewContext.Provider>
    );
}

export function useCrew() {
    const context = useContext(CrewContext);
    if (!context) {
        throw new Error("useCrew must be used within CrewProvider");
    }
    return context;
}
