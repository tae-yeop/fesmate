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

/** 내 프로필 정보 */
export interface MyProfile {
    id: string;
    nickname: string;
    avatar: string;
    bio: string;
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
                ...profiles[currentUserId],
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
