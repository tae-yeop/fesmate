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
import { useAuth } from "./auth-context";
import { MOCK_USER_PROFILES, useFollow } from "./follow-context";
import { useCrew } from "./crew-context";
import { createSharedAdapter, DOMAINS } from "./storage";
import {
    getUserProfile as getUserProfileFromDb,
    ensureUserExists,
    updateUserProfile as updateUserProfileInDb,
    updatePrivacySettings as updatePrivacySettingsInDb,
    type PrivacySettings as DbPrivacySettings,
} from "./supabase/queries";

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
    /** 데이터 소스 표시 */
    isFromSupabase: boolean;
    /** 로딩 상태 */
    isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

// Storage adapter (전역 공유 데이터) - Dev 모드용
const userProfilesAdapter = createSharedAdapter<Record<string, Omit<MyProfile, "id">>>({
    domain: DOMAINS.USER_PROFILES,
});

// 기본 프로필 (user1 기준)
const DEFAULT_PROFILE: Omit<MyProfile, "id"> = {
    nickname: "페스티벌러",
    avatar: "🎵",
    bio: "공연 다니는 게 인생 낙!",
    privacy: DEFAULT_PRIVACY_SETTINGS,
};

// DB PrivacySettings를 Frontend PrivacySettings로 변환
// DbPrivacySettings: { wishlist, attended, gonglog, badge, crewActivity, friendsList }
// Frontend: { wishlistVisibility, attendedVisibility, ... }
function transformDbPrivacyToFrontend(dbPrivacy: DbPrivacySettings | null): PrivacySettings {
    if (!dbPrivacy) return DEFAULT_PRIVACY_SETTINGS;

    return {
        wishlistVisibility: (dbPrivacy.wishlist as PrivacyLevel) || "friends",
        attendedVisibility: (dbPrivacy.attended as PrivacyLevel) || "public",
        gonglogVisibility: (dbPrivacy.gonglog as PrivacyLevel) || "public",
        badgeVisibility: (dbPrivacy.badge as PrivacyLevel) || "public",
        crewActivityVisibility: (dbPrivacy.crewActivity as PrivacyLevel) || "crew",
        friendsListVisibility: (dbPrivacy.friendsList as PrivacyLevel) || "friends",
    };
}

// Frontend PrivacySettings를 DB PrivacySettings로 변환
function transformFrontendPrivacyToDb(privacy: PrivacySettings): DbPrivacySettings {
    return {
        wishlist: privacy.wishlistVisibility,
        attended: privacy.attendedVisibility,
        gonglog: privacy.gonglogVisibility,
        badge: privacy.badgeVisibility,
        crewActivity: privacy.crewActivityVisibility,
        friendsList: privacy.friendsListVisibility,
    };
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: devIsLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();
    const { isMutualFollow } = useFollow();
    const { sharesCrew } = useCrew();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = devIsLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    const currentUserId = realUserId || devUserId;
    const isLoggedIn = !!currentUserId;

    // 사용자별 프로필 저장소 (Dev 모드용)
    const [localProfiles, setLocalProfiles] = useState<Record<string, Omit<MyProfile, "id">>>({});
    // Supabase에서 로드된 프로필 (실제 사용자용)
    const [supabaseProfile, setSupabaseProfile] = useState<MyProfile | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

    // Storage에서 불러오기 (Dev 모드용)
    useEffect(() => {
        Promise.resolve().then(() => {
            const stored = userProfilesAdapter.get();
            if (stored) {
                setLocalProfiles(stored);
            }
            setIsInitialized(true);
        });
    }, []);

    // Storage에 저장 (Dev 모드만)
    useEffect(() => {
        if (!isRealUser && isInitialized && Object.keys(localProfiles).length > 0) {
            userProfilesAdapter.set(localProfiles);
        }
    }, [localProfiles, isInitialized, isRealUser]);

    // 사용자 변경 또는 초기 로드 시 Supabase에서 프로필 로드
    useEffect(() => {
        if (loadedUserId !== currentUserId) {
            // 비로그인 시
            if (!currentUserId) {
                Promise.resolve().then(() => {
                    setSupabaseProfile(null);
                    setLoadedUserId(currentUserId);
                    setIsFromSupabase(false);
                });
                return;
            }

            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId && authUser) {
                setIsLoading(true);

                // 사용자가 없으면 생성, 있으면 조회
                ensureUserExists(authUser)
                    .then(async (dbUser) => {
                        // 생성/조회 후 상세 프로필 로드
                        const profile = await getUserProfileFromDb(realUserId);
                        if (profile) {
                            setSupabaseProfile({
                                id: profile.id,
                                nickname: profile.nickname,
                                avatar: profile.profileImage || "🎵",
                                bio: profile.bio || "",
                                privacy: transformDbPrivacyToFrontend(profile.privacySettings),
                            });
                            setIsFromSupabase(true);
                        } else {
                            // 프로필 조회 실패 시 기본값 사용
                            setSupabaseProfile({
                                id: realUserId,
                                nickname: authUser.user_metadata?.full_name || "사용자",
                                avatar: "🎵",
                                bio: "",
                                privacy: DEFAULT_PRIVACY_SETTINGS,
                            });
                            setIsFromSupabase(true);
                        }
                    })
                    .catch((error) => {
                        console.error("[UserProfileContext] Supabase load failed:", error);
                        // Supabase 실패 시 기본 프로필 사용
                        setSupabaseProfile({
                            id: realUserId,
                            nickname: authUser.user_metadata?.full_name || "사용자",
                            avatar: "🎵",
                            bio: "",
                            privacy: DEFAULT_PRIVACY_SETTINGS,
                        });
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 이미 로드됨
            setLoadedUserId(currentUserId);
            setIsFromSupabase(false);
        }
    }, [currentUserId, loadedUserId, isRealUser, realUserId, authUser]);

    // 현재 사용자의 프로필 가져오기
    const myProfile = useMemo((): MyProfile | null => {
        if (!currentUserId) return null;

        // 실제 사용자: Supabase 프로필 사용
        if (isRealUser && supabaseProfile) {
            return supabaseProfile;
        }

        // Dev 모드: localStorage 또는 Mock 데이터
        if (localProfiles[currentUserId]) {
            return {
                id: currentUserId,
                ...DEFAULT_PROFILE,
                ...localProfiles[currentUserId],
                privacy: {
                    ...DEFAULT_PRIVACY_SETTINGS,
                    ...(localProfiles[currentUserId].privacy || {}),
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
    }, [currentUserId, isRealUser, supabaseProfile, localProfiles]);

    // 프로필 업데이트
    const updateProfile = useCallback((updates: Partial<Omit<MyProfile, "id">>) => {
        if (!currentUserId) return;

        // Optimistic update
        if (isRealUser && supabaseProfile) {
            setSupabaseProfile(prev => prev ? { ...prev, ...updates } : null);

            // Supabase에 저장
            const dbUpdates: Record<string, unknown> = {};
            if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
            if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
            if (updates.bio !== undefined) dbUpdates.bio = updates.bio;

            if (Object.keys(dbUpdates).length > 0) {
                updateUserProfileInDb(currentUserId, dbUpdates).catch((error) => {
                    console.error("[UserProfileContext] updateProfile failed:", error);
                    // 롤백 (재로드)
                    setLoadedUserId(undefined);
                });
            }

            // 프라이버시 설정 별도 업데이트
            if (updates.privacy) {
                updatePrivacySettingsInDb(currentUserId, transformFrontendPrivacyToDb(updates.privacy)).catch((error) => {
                    console.error("[UserProfileContext] updatePrivacy failed:", error);
                });
            }
        } else {
            // Dev 모드: localStorage
            setLocalProfiles(prev => ({
                ...prev,
                [currentUserId]: {
                    ...(prev[currentUserId] || DEFAULT_PROFILE),
                    ...updates,
                },
            }));
        }
    }, [currentUserId, isRealUser, supabaseProfile]);

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

        const newPrivacy = {
            ...myProfile.privacy,
            ...updates,
        };

        // Optimistic update
        if (isRealUser && supabaseProfile) {
            setSupabaseProfile(prev => prev ? { ...prev, privacy: newPrivacy } : null);

            // Supabase에 저장
            updatePrivacySettingsInDb(currentUserId, transformFrontendPrivacyToDb(newPrivacy)).catch((error) => {
                console.error("[UserProfileContext] updatePrivacy failed:", error);
                // 롤백 (재로드)
                setLoadedUserId(undefined);
            });
        } else {
            // Dev 모드: localStorage
            setLocalProfiles(prev => ({
                ...prev,
                [currentUserId]: {
                    ...(prev[currentUserId] || DEFAULT_PROFILE),
                    privacy: newPrivacy,
                },
            }));
        }
    }, [currentUserId, myProfile, isRealUser, supabaseProfile]);

    // 개별 프라이버시 설정 변경
    const setPrivacySetting = useCallback(<K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K]
    ) => {
        updatePrivacy({ [key]: value });
    }, [updatePrivacy]);

    // 특정 사용자가 특정 정보를 볼 수 있는지 확인
    const canViewContent = useCallback((viewerId: string, contentType: keyof PrivacySettings): boolean => {
        if (!myProfile) return false;
        if (viewerId === currentUserId) return true; // 본인은 항상 볼 수 있음

        const level = myProfile.privacy[contentType];

        switch (level) {
            case "public":
                return true;
            case "friends":
                // 맞팔(친구) 관계 확인 - FollowContext의 isMutualFollow 사용
                return isMutualFollow(viewerId);
            case "crew":
                // 같은 크루에 속해 있는지 확인 - CrewContext의 sharesCrew 사용
                return sharesCrew(viewerId);
            case "private":
                return false;
            default:
                return false;
        }
    }, [myProfile, currentUserId, isMutualFollow, sharesCrew]);

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
                isFromSupabase,
                isLoading,
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
