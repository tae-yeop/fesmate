/**
 * Users Query Functions
 *
 * 사용자 프로필 Supabase 쿼리
 */

import { createClient } from "../client";
import type { User as AuthUser } from "@supabase/supabase-js";

export interface UserProfile {
    id: string;
    nickname: string;
    profileImage?: string;
    bio?: string;
    role: "USER" | "ADMIN";
    provider?: string;
    email?: string;
    followerCount: number;
    followingCount: number;
    attendedCount: number;
    featuredBadges: string[];
    privacySettings: PrivacySettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface PrivacySettings {
    wishlist?: "public" | "friends" | "crew" | "private";
    attended?: "public" | "friends" | "crew" | "private";
    gonglog?: "public" | "friends" | "crew" | "private";
    badge?: "public" | "friends" | "crew" | "private";
    crewActivity?: "public" | "friends" | "crew" | "private";
    friendsList?: "public" | "friends" | "crew" | "private";
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    wishlist: "public",
    attended: "public",
    gonglog: "public",
    badge: "public",
    crewActivity: "friends",
    friendsList: "friends",
};

/**
 * DB 레코드를 UserProfile로 변환
 */
function transformDbUser(dbUser: Record<string, unknown>): UserProfile {
    return {
        id: dbUser.id as string,
        nickname: dbUser.nickname as string,
        profileImage: dbUser.profile_image as string | undefined,
        bio: dbUser.bio as string | undefined,
        role: (dbUser.role as "USER" | "ADMIN") ?? "USER",
        provider: dbUser.provider as string | undefined,
        email: dbUser.email as string | undefined,
        followerCount: (dbUser.follower_count as number) ?? 0,
        followingCount: (dbUser.following_count as number) ?? 0,
        attendedCount: (dbUser.attended_count as number) ?? 0,
        featuredBadges: (dbUser.featured_badges as string[]) ?? [],
        privacySettings: {
            ...DEFAULT_PRIVACY_SETTINGS,
            ...(dbUser.privacy_settings as PrivacySettings),
        },
        createdAt: new Date(dbUser.created_at as string),
        updatedAt: new Date(dbUser.updated_at as string),
    };
}

/**
 * 사용자 프로필 조회
 */
export async function getUserProfile(
    userId: string
): Promise<UserProfile | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // no rows returned
            return null;
        }
        console.error("[getUserProfile] Error:", error);
        throw error;
    }

    return transformDbUser(data);
}

/**
 * 여러 사용자 프로필 조회
 */
export async function getUserProfiles(
    userIds: string[]
): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];

    const supabase = createClient();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("id", userIds);

    if (error) {
        console.error("[getUserProfiles] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbUser);
}

/**
 * 로그인 시 사용자 생성/조회 (upsert)
 */
export async function ensureUserExists(authUser: AuthUser): Promise<UserProfile> {
    const supabase = createClient();

    // 먼저 기존 사용자 확인
    const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

    if (existing) {
        return transformDbUser(existing);
    }

    // 새 사용자 생성
    const nickname =
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split("@")[0] ||
        `User${authUser.id.slice(0, 6)}`;

    const { data, error } = await supabase
        .from("users")
        .insert({
            id: authUser.id,
            nickname,
            email: authUser.email,
            provider: authUser.app_metadata?.provider,
            profile_image: authUser.user_metadata?.avatar_url,
            privacy_settings: DEFAULT_PRIVACY_SETTINGS,
        })
        .select()
        .single();

    if (error) {
        console.error("[ensureUserExists] Error:", JSON.stringify(error, null, 2));
        console.error("[ensureUserExists] Error code:", error.code);
        console.error("[ensureUserExists] Error message:", error.message);
        console.error("[ensureUserExists] Error details:", error.details);
        throw error;
    }

    return transformDbUser(data);
}

/**
 * 프로필 업데이트
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<{
        nickname: string;
        profileImage: string;
        bio: string;
        featuredBadges: string[];
    }>
): Promise<UserProfile> {
    const supabase = createClient();

    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.nickname !== undefined) {
        dbUpdates.nickname = updates.nickname;
    }
    if (updates.profileImage !== undefined) {
        dbUpdates.profile_image = updates.profileImage;
    }
    if (updates.bio !== undefined) {
        dbUpdates.bio = updates.bio;
    }
    if (updates.featuredBadges !== undefined) {
        dbUpdates.featured_badges = updates.featuredBadges;
    }

    const { data, error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", userId)
        .select()
        .single();

    if (error) {
        console.error("[updateUserProfile] Error:", error);
        throw error;
    }

    return transformDbUser(data);
}

/**
 * 프라이버시 설정 업데이트
 */
export async function updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
    const supabase = createClient();

    // 현재 설정 조회
    const { data: currentUser } = await supabase
        .from("users")
        .select("privacy_settings")
        .eq("id", userId)
        .single();

    const currentSettings = currentUser?.privacy_settings ?? DEFAULT_PRIVACY_SETTINGS;
    const newSettings = { ...currentSettings, ...settings };

    const { data, error } = await supabase
        .from("users")
        .update({
            privacy_settings: newSettings,
            updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("privacy_settings")
        .single();

    if (error) {
        console.error("[updatePrivacySettings] Error:", error);
        throw error;
    }

    return data?.privacy_settings ?? newSettings;
}

/**
 * 사용자 검색 (닉네임으로)
 */
export async function searchUsers(
    query: string,
    limit: number = 10
): Promise<UserProfile[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("nickname", `%${query}%`)
        .limit(limit);

    if (error) {
        console.error("[searchUsers] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbUser);
}
