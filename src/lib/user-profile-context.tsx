"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import { useDevContext } from "./dev-context";
import { MOCK_USER_PROFILES } from "./follow-context";

/** 프라이버시 공개 대상 */
export type PrivacyLevel = "public" | "friends" | "crew" | "private";

/** 프라이버시 설정 항목 */
export interface PrivacySettings {
    /** 찜 목록 공개 범위 */
    wishlistVisibility: PrivacyLevel;
    /** 다녀온 행사 공개 범위 */
    attendedVisibility: PrivacyLevel;
    /** 공연로그/통계 공개 범위 */
    gonglogVisibility: PrivacyLevel;
    /** 배지 공개 범위 */
    badgeVisibility: PrivacyLevel;
    /** 크루 활동(캘린더) 공개 범위 */
    crewActivityVisibility: PrivacyLevel;
    /** 친구 목록 공개 범위 */
    friendsListVisibility: PrivacyLevel;
}

/** 프라이버시 레벨 라벨 */
export const PRIVACY_LEVEL_LABELS: Record<PrivacyLevel, { label: string; description: string }> = {
    public: { label: "전체 공개", description: "모든 사용자가 볼 수 있어요" },
    friends: { label: "친구만", description: "맞팔 친구만 볼 수 있어요" },
    crew: { label: "크루원만", description: "같은 크루원만 볼 수 있어요" },
    private: { label: "나만 보기", description: "나만 볼 수 있어요" },
};

/** 프라이버시 설정 항목 라벨 */
export const PRIVACY_SETTING_LABELS: Record<keyof PrivacySettings, { label: string; description: string }> = {
    wishlistVisibility: { label: "찜 목록", description: "내가 찜한 행사 목록" },
    attendedVisibility: { label: "다녀온 행사", description: "내가 다녀온 행사 목록" },
    gonglogVisibility: { label: "공연로그", description: "관람 통계 및 기록" },
    badgeVisibility: { label: "배지", description: "획득한 배지 목록" },
    crewActivityVisibility: { label: "크루 캘린더", description: "크루 캘린더에 내 행사 표시" },
    friendsListVisibility: { label: "친구 목록", description: "팔로워/팔로잉 목록" },
};

/** 기본 프라이버시 설정 */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    wishlistVisibility: "friends",
    attendedVisibility: "public",
    gonglogVisibility: "public",
    badgeVisibility: "public",
    crewActivityVisibility: "crew",
    friendsListVisibility: "friends",
};

/** 내 프로필 정보 */
export interface MyProfile {
    id: string;
    nickname: string;
    avatar: string;
    bio: string;
    privacy: PrivacySettings;
}

/** 아바타로 사용 가능한 이모지 목록 */
export const AVATAR_OPTIONS = [
    "🎵", "🎸", "🎤", "🎹", "🎺", "🎷", "🥁", "🎻",
    "🎧", "🎼", "🎶", "🎙️", "🔥", "⭐", "✨", "💫",
    "🚀", "🌟", "💜", "💙", "💚", "💛", "🧡", "❤️",
    "🦋", "🌈", "🎪", "🎭", "🎨", "🎬", "🎯", "🎲",
];

interface UserProfileContextValue {
    /** 현재 로그인한 사용자 ID */
    currentUserId: string | null;
    /** 로그인 여부 */
    isLoggedIn: boolean;
    /** 내 프로필 정보 (로그인 시) */
    myProfile: MyProfile | null;
    /** 프로필 업데이트 */
    updateProfile: (updates: Partial<Omit<MyProfile, "id">>) => void;
    /** 닉네임 변경 */
    setNickname: (nickname: string) => void;
    /** 아바타 변경 */
    setAvatar: (avatar: string) => void;
    /** 한줄소개 변경 */
    setBio: (bio: string) => void;
    /** 프라이버시 설정 변경 */
    updatePrivacy: (updates: Partial<PrivacySettings>) => void;
    /** 특정 프라이버시 설정 변경 */
    setPrivacySetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => void;
    /** 특정 사용자가 특정 정보를 볼 수 있는지 확인 */
    canViewContent: (viewerId: string, contentType: keyof PrivacySettings) => boolean;
    /** 초기화 여부 */
    isInitialized: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

const STORAGE_KEY = "fesmate_user_profiles";

// 기본 프로필 (user1 기준)
const DEFAULT_PROFILE: Omit<MyProfile, "id"> = {
    nickname: "페스티벌러",
    avatar: "🎵",
    bio: "공연 다니는 게 인생 낙!",
    privacy: DEFAULT_PRIVACY_SETTINGS,
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: devIsLoggedIn } = useDevContext();

    // 사용자별 프로필 저장소 (userId -> Profile)
    const [profiles, setProfiles] = useState<Record<string, Omit<MyProfile, "id">>>({});
    const [isInitialized, setIsInitialized] = useState(false);

    // 현재 로그인한 사용자 ID
    const currentUserId = mockUserId;
    const isLoggedIn = devIsLoggedIn;

    // localStorage에서 불러오기
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setProfiles(parsed);
            }
        } catch {
            console.error("Failed to parse user profiles from localStorage");
        }
        setIsInitialized(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
            } catch {
                console.error("Failed to save user profiles to localStorage");
            }
        }
    }, [profiles, isInitialized]);

    // 현재 사용자의 프로필 가져오기
    const myProfile = useMemo((): MyProfile | null => {
        if (!currentUserId) return null;

        // 저장된 커스텀 프로필이 있으면 사용
        if (profiles[currentUserId]) {
            return {
                id: currentUserId,
                ...DEFAULT_PROFILE,
                ...profiles[currentUserId],
                privacy: {
                    ...DEFAULT_PRIVACY_SETTINGS,
                    ...(profiles[currentUserId].privacy || {}),
                },
            };
        }

        // Mock 데이터에서 찾기
        const mockProfile = MOCK_USER_PROFILES.find(u => u.id === currentUserId);
        if (mockProfile) {
            return {
                id: currentUserId,
                nickname: mockProfile.nickname,
                avatar: mockProfile.avatar || "🎵",
                bio: mockProfile.bio || "",
                privacy: DEFAULT_PRIVACY_SETTINGS,
            };
        }

        // 기본 프로필
        return {
            id: currentUserId,
            ...DEFAULT_PROFILE,
        };
    }, [currentUserId, profiles]);

    // 프로필 업데이트
    const updateProfile = useCallback((updates: Partial<Omit<MyProfile, "id">>) => {
        if (!currentUserId) return;

        setProfiles(prev => ({
            ...prev,
            [currentUserId]: {
                ...(prev[currentUserId] || DEFAULT_PROFILE),
                ...updates,
            },
        }));
    }, [currentUserId]);

    // 개별 setter
    const setNickname = useCallback((nickname: string) => {
        updateProfile({ nickname });
    }, [updateProfile]);

    const setAvatar = useCallback((avatar: string) => {
        updateProfile({ avatar });
    }, [updateProfile]);

    const setBio = useCallback((bio: string) => {
        updateProfile({ bio });
    }, [updateProfile]);

    // 프라이버시 설정 업데이트
    const updatePrivacy = useCallback((updates: Partial<PrivacySettings>) => {
        if (!currentUserId || !myProfile) return;

        setProfiles(prev => ({
            ...prev,
            [currentUserId]: {
                ...(prev[currentUserId] || DEFAULT_PROFILE),
                privacy: {
                    ...(prev[currentUserId]?.privacy || DEFAULT_PRIVACY_SETTINGS),
                    ...updates,
                },
            },
        }));
    }, [currentUserId, myProfile]);

    // 개별 프라이버시 설정 변경
    const setPrivacySetting = useCallback(<K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K]
    ) => {
        updatePrivacy({ [key]: value });
    }, [updatePrivacy]);

    // 특정 사용자가 특정 정보를 볼 수 있는지 확인
    // TODO: 실제로는 친구/크루 관계를 확인해야 함
    const canViewContent = useCallback((viewerId: string, contentType: keyof PrivacySettings): boolean => {
        if (!myProfile) return false;
        if (viewerId === currentUserId) return true; // 본인은 항상 볼 수 있음

        const level = myProfile.privacy[contentType];

        switch (level) {
            case "public":
                return true;
            case "friends":
                // TODO: 실제 친구 관계 확인 (FollowContext에서 맞팔 확인)
                return false;
            case "crew":
                // TODO: 실제 크루 관계 확인 (CrewContext에서 같은 크루인지)
                return false;
            case "private":
                return false;
            default:
                return false;
        }
    }, [myProfile, currentUserId]);

    return (
        <UserProfileContext.Provider
            value={{
                currentUserId,
                isLoggedIn,
                myProfile,
                updateProfile,
                setNickname,
                setAvatar,
                setBio,
                updatePrivacy,
                setPrivacySetting,
                canViewContent,
                isInitialized,
            }}
        >
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error("useUserProfile must be used within UserProfileProvider");
    }
    return context;
}
