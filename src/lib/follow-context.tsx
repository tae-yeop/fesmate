"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import {
    Follow,
    UserProfile,
    FriendActivity,
    FollowStatus,
} from "@/types/follow";
import { useDevContext } from "./dev-context";

// ===== Mock 사용자 프로필 데이터 =====

export const MOCK_USER_PROFILES: UserProfile[] = [
    {
        id: "user1",
        nickname: "페스티벌러",
        avatar: "🎵",
        bio: "공연 다니는 게 인생 낙! 록 페스티벌 광팬입니다.",
        followerCount: 42,
        followingCount: 28,
        attendedCount: 15,
        joinedAt: new Date("2024-01-15"),
        featuredBadges: ["concert_fan", "festival_lover"],
    },
    {
        id: "user2",
        nickname: "록페스러버",
        avatar: "🎸",
        bio: "지산, 펜타포트 매년 갑니다!",
        followerCount: 156,
        followingCount: 89,
        attendedCount: 48,
        joinedAt: new Date("2023-06-20"),
        featuredBadges: ["festival_master", "nationwide_tourer"],
    },
    {
        id: "user3",
        nickname: "인디키드",
        avatar: "🎤",
        bio: "홍대 인디씬 탐험 중",
        followerCount: 73,
        followingCount: 41,
        attendedCount: 32,
        joinedAt: new Date("2023-11-05"),
        featuredBadges: ["concert_fan", "seoul_conqueror"],
    },
    {
        id: "user4",
        nickname: "투어러",
        avatar: "🚀",
        bio: "전국 콘서트 투어러! 어디든 갑니다",
        followerCount: 234,
        followingCount: 112,
        attendedCount: 67,
        joinedAt: new Date("2023-03-10"),
        featuredBadges: ["nationwide_tourer", "performance_god"],
    },
    {
        id: "user5",
        nickname: "재즈매니아",
        avatar: "🎷",
        bio: "재즈 클럽 투어 중",
        followerCount: 45,
        followingCount: 33,
        attendedCount: 28,
        joinedAt: new Date("2024-02-01"),
    },
    {
        id: "user6",
        nickname: "DJ마스터",
        avatar: "🔥",
        bio: "EDM is my life",
        followerCount: 189,
        followingCount: 76,
        attendedCount: 41,
        joinedAt: new Date("2023-08-15"),
    },
];

// ===== Mock 팔로우 관계 데이터 =====

export const MOCK_FOLLOWS: Follow[] = [
    // user1의 팔로잉
    { followerId: "user1", followingId: "user2", createdAt: new Date("2024-06-01") },
    { followerId: "user1", followingId: "user3", createdAt: new Date("2024-07-15") },
    { followerId: "user1", followingId: "user4", createdAt: new Date("2024-08-01") },
    // user1을 팔로우하는 사람들 (맞팔)
    { followerId: "user2", followingId: "user1", createdAt: new Date("2024-06-05") },
    { followerId: "user3", followingId: "user1", createdAt: new Date("2024-07-20") },
    // 다른 관계들
    { followerId: "user4", followingId: "user2", createdAt: new Date("2024-05-01") },
    { followerId: "user5", followingId: "user1", createdAt: new Date("2024-09-01") },
    { followerId: "user6", followingId: "user4", createdAt: new Date("2024-04-15") },
];

// ===== Mock 친구 활동 데이터 =====

export const MOCK_FRIEND_ACTIVITIES: FriendActivity[] = [
    {
        id: "fa1",
        userId: "user2",
        userNickname: "록페스러버",
        userAvatar: "🎸",
        type: "wishlist",
        eventId: "e2",
        eventTitle: "인천 펜타포트 락 페스티벌 2025",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    },
    {
        id: "fa2",
        userId: "user3",
        userNickname: "인디키드",
        userAvatar: "🎤",
        type: "attended",
        eventId: "55948",
        eventTitle: "2025 기생충 콘서트",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5시간 전
    },
    {
        id: "fa3",
        userId: "user2",
        userNickname: "록페스러버",
        userAvatar: "🎸",
        type: "review",
        eventId: "24016943",
        eventTitle: "현대카드 슈퍼콘서트 27 OASIS",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 어제
        content: "역대급 공연이었어요! 노엘 갤러거 목소리 아직도 생생해요...",
    },
    {
        id: "fa4",
        userId: "user4",
        userNickname: "투어러",
        userAvatar: "🚀",
        type: "wishlist",
        eventId: "e2",
        eventTitle: "인천 펜타포트 락 페스티벌 2025",
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 1.5일 전
    },
    {
        id: "fa5",
        userId: "user3",
        userNickname: "인디키드",
        userAvatar: "🎤",
        type: "joined_crew",
        crewId: "crew2",
        crewName: "인디씬 크루",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2일 전
    },
    {
        id: "fa6",
        userId: "user2",
        userNickname: "록페스러버",
        userAvatar: "🎸",
        type: "attended",
        eventId: "e2",
        eventTitle: "인천 펜타포트 락 페스티벌 2025",
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3일 전
    },
];

// ===== Context =====

interface FollowContextValue {
    /** 현재 사용자 ID */
    currentUserId: string;
    /** 사용자 프로필 조회 */
    getUserProfile: (userId: string) => UserProfile | undefined;
    /** 팔로워 목록 조회 */
    getFollowers: (userId: string) => UserProfile[];
    /** 팔로잉 목록 조회 */
    getFollowing: (userId: string) => UserProfile[];
    /** 팔로우 상태 조회 */
    getFollowStatus: (targetUserId: string) => FollowStatus;
    /** 팔로우하기 */
    follow: (targetUserId: string) => void;
    /** 언팔로우 */
    unfollow: (targetUserId: string) => void;
    /** 친구(맞팔) 목록 조회 */
    getFriends: () => UserProfile[];
    /** 친구 활동 피드 조회 */
    getFriendActivities: () => FriendActivity[];
    /** 추천 사용자 (팔로우하지 않은) */
    getSuggestedUsers: () => UserProfile[];
    /** 팔로워 수 */
    getFollowerCount: (userId: string) => number;
    /** 팔로잉 수 */
    getFollowingCount: (userId: string) => number;
    /** 현재 사용자와 특정 사용자가 맞팔인지 확인 */
    isMutualFollow: (targetUserId: string) => boolean;
}

const FollowContext = createContext<FollowContextValue | null>(null);

const STORAGE_KEY_FOLLOWS = "fesmate_follows";

export function FollowProvider({ children }: { children: ReactNode }) {
    const { mockUserId } = useDevContext();
    const currentUserId = mockUserId || "user1"; // Dev 모드 사용자 ID 또는 기본값

    const [follows, setFollows] = useState<Follow[]>(MOCK_FOLLOWS);
    const [isInitialized, setIsInitialized] = useState(false);

    // localStorage에서 불러오기
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_FOLLOWS);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setFollows(parsed.map((f: Follow) => ({
                    ...f,
                    createdAt: new Date(f.createdAt),
                })));
            } catch {
                console.error("Failed to parse follows from localStorage");
            }
        }
        setIsInitialized(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY_FOLLOWS, JSON.stringify(follows));
        }
    }, [follows, isInitialized]);

    // 사용자 프로필 조회
    const getUserProfile = useCallback((userId: string) => {
        return MOCK_USER_PROFILES.find(u => u.id === userId);
    }, []);

    // 팔로워 목록
    const getFollowers = useCallback((userId: string) => {
        const followerIds = follows
            .filter(f => f.followingId === userId)
            .map(f => f.followerId);
        return MOCK_USER_PROFILES.filter(u => followerIds.includes(u.id));
    }, [follows]);

    // 팔로잉 목록
    const getFollowing = useCallback((userId: string) => {
        const followingIds = follows
            .filter(f => f.followerId === userId)
            .map(f => f.followingId);
        return MOCK_USER_PROFILES.filter(u => followingIds.includes(u.id));
    }, [follows]);

    // 팔로우 상태
    const getFollowStatus = useCallback((targetUserId: string): FollowStatus => {
        const iFollow = follows.some(
            f => f.followerId === currentUserId && f.followingId === targetUserId
        );
        const theyFollow = follows.some(
            f => f.followerId === targetUserId && f.followingId === currentUserId
        );

        if (iFollow && theyFollow) return "mutual";
        if (iFollow) return "following";
        if (theyFollow) return "follower";
        return "none";
    }, [follows, currentUserId]);

    // 팔로우하기
    const follow = useCallback((targetUserId: string) => {
        if (targetUserId === currentUserId) return;

        const exists = follows.some(
            f => f.followerId === currentUserId && f.followingId === targetUserId
        );
        if (exists) return;

        const newFollow: Follow = {
            followerId: currentUserId,
            followingId: targetUserId,
            createdAt: new Date(),
        };
        setFollows(prev => [...prev, newFollow]);
    }, [follows, currentUserId]);

    // 언팔로우
    const unfollow = useCallback((targetUserId: string) => {
        setFollows(prev => prev.filter(
            f => !(f.followerId === currentUserId && f.followingId === targetUserId)
        ));
    }, [currentUserId]);

    // 친구(맞팔) 목록
    const getFriends = useCallback(() => {
        const myFollowing = follows
            .filter(f => f.followerId === currentUserId)
            .map(f => f.followingId);
        const myFollowers = follows
            .filter(f => f.followingId === currentUserId)
            .map(f => f.followerId);

        const mutualIds = myFollowing.filter(id => myFollowers.includes(id));
        return MOCK_USER_PROFILES.filter(u => mutualIds.includes(u.id));
    }, [follows, currentUserId]);

    // 친구 활동 피드
    const getFriendActivities = useCallback(() => {
        const followingIds = follows
            .filter(f => f.followerId === currentUserId)
            .map(f => f.followingId);

        return MOCK_FRIEND_ACTIVITIES
            .filter(a => followingIds.includes(a.userId))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [follows, currentUserId]);

    // 추천 사용자
    const getSuggestedUsers = useCallback(() => {
        const followingIds = follows
            .filter(f => f.followerId === currentUserId)
            .map(f => f.followingId);

        return MOCK_USER_PROFILES.filter(
            u => u.id !== currentUserId && !followingIds.includes(u.id)
        );
    }, [follows, currentUserId]);

    // 팔로워/팔로잉 수
    const getFollowerCount = useCallback((userId: string) => {
        return follows.filter(f => f.followingId === userId).length;
    }, [follows]);

    const getFollowingCount = useCallback((userId: string) => {
        return follows.filter(f => f.followerId === userId).length;
    }, [follows]);

    // 현재 사용자와 특정 사용자가 맞팔인지 확인
    const isMutualFollow = useCallback((targetUserId: string): boolean => {
        const iFollow = follows.some(
            f => f.followerId === currentUserId && f.followingId === targetUserId
        );
        const theyFollow = follows.some(
            f => f.followerId === targetUserId && f.followingId === currentUserId
        );
        return iFollow && theyFollow;
    }, [follows, currentUserId]);

    return (
        <FollowContext.Provider
            value={{
                currentUserId,
                getUserProfile,
                getFollowers,
                getFollowing,
                getFollowStatus,
                follow,
                unfollow,
                getFriends,
                getFriendActivities,
                getSuggestedUsers,
                getFollowerCount,
                getFollowingCount,
                isMutualFollow,
            }}
        >
            {children}
        </FollowContext.Provider>
    );
}

export function useFollow() {
    const context = useContext(FollowContext);
    if (!context) {
        throw new Error("useFollow must be used within FollowProvider");
    }
    return context;
}
