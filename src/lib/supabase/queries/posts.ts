/**
 * Post Query Functions
 *
 * 글(Post) 관련 Supabase 쿼리
 * - posts: 실시간 제보, 커뮤니티, 후기 등
 */

import { createClient } from "../client";
import type {
    Post,
    PostType,
    PostStatus,
    TrustLevel,
} from "@/types/post";

// ===== Helper: Transform DB row to frontend type =====

function transformDbPost(row: Record<string, unknown>): Post {
    return {
        id: row.id as string,
        eventId: row.event_id as string,
        userId: row.user_id as string,
        type: row.type as PostType,
        status: row.status as PostStatus,
        content: row.content as string,
        images: undefined, // post_images 테이블에서 별도 조회 필요
        helpfulCount: (row.helpful_count as number) || 0,
        trustLevel: row.trust_level as TrustLevel | undefined,
        rating: row.rating as number | undefined,
        slotId: row.slot_id as string | undefined,
        videoUrl: row.video_url as string | undefined,
        meetAt: row.meet_at ? new Date(row.meet_at as string) : undefined,
        departAt: row.depart_at ? new Date(row.depart_at as string) : undefined,
        checkinAt: row.checkin_at ? new Date(row.checkin_at as string) : undefined,
        maxPeople: row.max_people as number | undefined,
        currentPeople: row.current_people as number | undefined,
        budget: row.budget as string | undefined,
        price: row.price as string | undefined,
        rules: row.rules as string | undefined,
        contactMethod: row.contact_method as string | undefined,
        placeText: row.place_text as string | undefined,
        placeHint: row.place_hint as string | undefined,
        expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
        lastBumpedAt: row.last_bumped_at ? new Date(row.last_bumped_at as string) : undefined,
        isPinned: row.is_pinned as boolean | undefined,
        isUrgent: row.is_urgent as boolean | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
    };
}

// ===== Query Functions =====

/**
 * 특정 이벤트의 글 목록 조회
 */
export async function getPostsByEvent(
    eventId: string,
    options?: {
        types?: PostType[];
        status?: PostStatus;
        limit?: number;
        offset?: number;
    }
): Promise<Post[]> {
    const supabase = createClient();

    let query = supabase
        .from("posts")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    if (options?.types && options.types.length > 0) {
        query = query.in("type", options.types);
    }

    if (options?.status) {
        query = query.eq("status", options.status);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getPostsByEvent] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbPost);
}

/**
 * 특정 사용자의 글 목록 조회
 */
export async function getPostsByUser(
    userId: string,
    options?: {
        types?: PostType[];
        limit?: number;
    }
): Promise<Post[]> {
    const supabase = createClient();

    let query = supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (options?.types && options.types.length > 0) {
        query = query.in("type", options.types);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getPostsByUser] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbPost);
}

/**
 * 커뮤니티 글 목록 조회 (타입별)
 */
export async function getCommunityPosts(
    type: PostType,
    options?: {
        eventId?: string;
        status?: PostStatus;
        limit?: number;
        offset?: number;
    }
): Promise<Post[]> {
    const supabase = createClient();

    let query = supabase
        .from("posts")
        .select("*")
        .eq("type", type)
        .order("created_at", { ascending: false });

    if (options?.eventId) {
        query = query.eq("event_id", options.eventId);
    }

    if (options?.status) {
        query = query.eq("status", options.status);
    } else {
        // 기본: ACTIVE와 EXPIRING만
        query = query.in("status", ["ACTIVE", "EXPIRING"]);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getCommunityPosts] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbPost);
}

/**
 * 모든 커뮤니티 글 목록 조회 (여러 타입)
 */
export async function getAllCommunityPosts(
    types: PostType[],
    options?: {
        eventId?: string;
        status?: PostStatus;
        limit?: number;
        offset?: number;
    }
): Promise<Post[]> {
    const supabase = createClient();

    let query = supabase
        .from("posts")
        .select("*")
        .in("type", types)
        .order("created_at", { ascending: false });

    if (options?.eventId) {
        query = query.eq("event_id", options.eventId);
    }

    if (options?.status) {
        query = query.eq("status", options.status);
    } else {
        query = query.in("status", ["ACTIVE", "EXPIRING"]);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getAllCommunityPosts] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbPost);
}

/**
 * 글 상세 조회
 */
export async function getPost(postId: string): Promise<Post | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        console.error("[getPost] Error:", error);
        throw error;
    }

    return data ? transformDbPost(data) : null;
}

/**
 * 글 작성
 */
export interface CreatePostInput {
    eventId: string;
    type: PostType;
    content: string;
    // 실시간 제보용
    trustLevel?: TrustLevel;
    // 리뷰용
    rating?: number;
    slotId?: string;
    // 영상용
    videoUrl?: string;
    // 커뮤니티용
    meetAt?: Date;
    departAt?: Date;
    checkinAt?: Date;
    maxPeople?: number;
    budget?: string;
    price?: string;
    rules?: string;
    contactMethod?: string;
    placeText?: string;
    placeHint?: string;
    expiresAt?: Date;
    // 공식용
    isPinned?: boolean;
    isUrgent?: boolean;
}

export async function createPost(
    userId: string,
    input: CreatePostInput
): Promise<Post> {
    const supabase = createClient();

    const insertData: Record<string, unknown> = {
        user_id: userId,
        event_id: input.eventId,
        type: input.type,
        content: input.content,
        status: "ACTIVE",
        helpful_count: 0,
        current_people: 1,
    };

    // 선택적 필드들
    if (input.trustLevel) insertData.trust_level = input.trustLevel;
    if (input.rating) insertData.rating = input.rating;
    if (input.slotId) insertData.slot_id = input.slotId;
    if (input.videoUrl) insertData.video_url = input.videoUrl;
    if (input.meetAt) insertData.meet_at = input.meetAt.toISOString();
    if (input.departAt) insertData.depart_at = input.departAt.toISOString();
    if (input.checkinAt) insertData.checkin_at = input.checkinAt.toISOString();
    if (input.maxPeople) insertData.max_people = input.maxPeople;
    if (input.budget) insertData.budget = input.budget;
    if (input.price) insertData.price = input.price;
    if (input.rules) insertData.rules = input.rules;
    if (input.contactMethod) insertData.contact_method = input.contactMethod;
    if (input.placeText) insertData.place_text = input.placeText;
    if (input.placeHint) insertData.place_hint = input.placeHint;
    if (input.expiresAt) insertData.expires_at = input.expiresAt.toISOString();
    if (input.isPinned) insertData.is_pinned = input.isPinned;
    if (input.isUrgent) insertData.is_urgent = input.isUrgent;

    const { data, error } = await supabase
        .from("posts")
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error("[createPost] Error:", error);
        throw error;
    }

    return transformDbPost(data);
}

/**
 * 글 수정
 */
export interface UpdatePostInput {
    content?: string;
    status?: PostStatus;
    meetAt?: Date | null;
    departAt?: Date | null;
    checkinAt?: Date | null;
    maxPeople?: number;
    budget?: string;
    price?: string;
    rules?: string;
    contactMethod?: string;
    placeText?: string;
    placeHint?: string;
    expiresAt?: Date | null;
    isPinned?: boolean;
    isUrgent?: boolean;
}

export async function updatePost(
    postId: string,
    input: UpdatePostInput
): Promise<Post> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};

    if (input.content !== undefined) updateData.content = input.content;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.meetAt !== undefined) {
        updateData.meet_at = input.meetAt ? input.meetAt.toISOString() : null;
    }
    if (input.departAt !== undefined) {
        updateData.depart_at = input.departAt ? input.departAt.toISOString() : null;
    }
    if (input.checkinAt !== undefined) {
        updateData.checkin_at = input.checkinAt ? input.checkinAt.toISOString() : null;
    }
    if (input.maxPeople !== undefined) updateData.max_people = input.maxPeople;
    if (input.budget !== undefined) updateData.budget = input.budget;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.rules !== undefined) updateData.rules = input.rules;
    if (input.contactMethod !== undefined) updateData.contact_method = input.contactMethod;
    if (input.placeText !== undefined) updateData.place_text = input.placeText;
    if (input.placeHint !== undefined) updateData.place_hint = input.placeHint;
    if (input.expiresAt !== undefined) {
        updateData.expires_at = input.expiresAt ? input.expiresAt.toISOString() : null;
    }
    if (input.isPinned !== undefined) updateData.is_pinned = input.isPinned;
    if (input.isUrgent !== undefined) updateData.is_urgent = input.isUrgent;

    const { data, error } = await supabase
        .from("posts")
        .update(updateData)
        .eq("id", postId)
        .select()
        .single();

    if (error) {
        console.error("[updatePost] Error:", error);
        throw error;
    }

    return transformDbPost(data);
}

/**
 * 글 삭제
 */
export async function deletePost(postId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

    if (error) {
        console.error("[deletePost] Error:", error);
        throw error;
    }
}

/**
 * 글 상태 변경 (만료, 모집완료 등)
 */
export async function updatePostStatus(
    postId: string,
    status: PostStatus
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("posts")
        .update({ status })
        .eq("id", postId);

    if (error) {
        console.error("[updatePostStatus] Error:", error);
        throw error;
    }
}

/**
 * 글 끌어올리기 (bump)
 */
export async function bumpPost(postId: string): Promise<Post> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("posts")
        .update({ last_bumped_at: new Date().toISOString() })
        .eq("id", postId)
        .select()
        .single();

    if (error) {
        console.error("[bumpPost] Error:", error);
        throw error;
    }

    return transformDbPost(data);
}

/**
 * 글 현재 인원 증가
 */
export async function incrementCurrentPeople(postId: string): Promise<void> {
    const supabase = createClient();

    // 현재 값 조회 후 증가 (트랜잭션 대신 단순 업데이트)
    const { data: current, error: selectError } = await supabase
        .from("posts")
        .select("current_people, max_people")
        .eq("id", postId)
        .single();

    if (selectError) {
        console.error("[incrementCurrentPeople] Select Error:", selectError);
        throw selectError;
    }

    const currentPeople = (current?.current_people as number) || 1;
    const maxPeople = current?.max_people as number | undefined;

    // 최대 인원 체크
    if (maxPeople && currentPeople >= maxPeople) {
        throw new Error("Maximum participants reached");
    }

    const { error: updateError } = await supabase
        .from("posts")
        .update({ current_people: currentPeople + 1 })
        .eq("id", postId);

    if (updateError) {
        console.error("[incrementCurrentPeople] Update Error:", updateError);
        throw updateError;
    }
}

/**
 * 글 현재 인원 감소
 */
export async function decrementCurrentPeople(postId: string): Promise<void> {
    const supabase = createClient();

    const { data: current, error: selectError } = await supabase
        .from("posts")
        .select("current_people")
        .eq("id", postId)
        .single();

    if (selectError) {
        console.error("[decrementCurrentPeople] Select Error:", selectError);
        throw selectError;
    }

    const currentPeople = (current?.current_people as number) || 1;

    const { error: updateError } = await supabase
        .from("posts")
        .update({ current_people: Math.max(1, currentPeople - 1) })
        .eq("id", postId);

    if (updateError) {
        console.error("[decrementCurrentPeople] Update Error:", updateError);
        throw updateError;
    }
}

/**
 * 허브 탭용 피드 조회 (실시간 제보 + 최신순)
 */
export async function getHubFeed(
    eventId: string,
    options?: {
        types?: PostType[];
        limit?: number;
    }
): Promise<Post[]> {
    const supabase = createClient();

    const hubTypes: PostType[] = options?.types || ["gate", "md", "facility", "safety"];

    let query = supabase
        .from("posts")
        .select("*")
        .eq("event_id", eventId)
        .in("type", hubTypes)
        .order("created_at", { ascending: false });

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getHubFeed] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbPost);
}

/**
 * 이미지 URL 목록 조회 (별도 테이블)
 */
export async function getPostImages(postId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("post_images")
        .select("url")
        .eq("post_id", postId)
        .order("display_order", { ascending: true });

    if (error) {
        console.error("[getPostImages] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.url as string);
}

/**
 * 이미지 추가
 */
export async function addPostImage(
    postId: string,
    url: string,
    storagePath?: string,
    displayOrder?: number
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("post_images")
        .insert({
            post_id: postId,
            url,
            storage_path: storagePath || null,
            display_order: displayOrder || 0,
        });

    if (error) {
        console.error("[addPostImage] Error:", error);
        throw error;
    }
}

/**
 * 이미지 삭제
 */
export async function deletePostImages(postId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("post_images")
        .delete()
        .eq("post_id", postId);

    if (error) {
        console.error("[deletePostImages] Error:", error);
        throw error;
    }
}

/**
 * 사용자별 글 개수 통계 조회
 * - 배지 조건 계산에 사용
 */
export interface PostCountStats {
    totalCount: number;
    reportCount: number;
}

export async function getPostCountByUser(userId: string): Promise<PostCountStats> {
    const supabase = createClient();

    // 전체 글 개수
    const { count: totalCount, error: totalError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    if (totalError) {
        console.error("[getPostCountByUser] Total count error:", totalError);
        // 에러 시 0 반환 (폴백)
        return { totalCount: 0, reportCount: 0 };
    }

    // 실시간 제보 글 개수 (gate, md, facility, safety)
    const { count: reportCount, error: reportError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("type", ["gate", "md", "facility", "safety"]);

    if (reportError) {
        console.error("[getPostCountByUser] Report count error:", reportError);
        return { totalCount: totalCount || 0, reportCount: 0 };
    }

    return {
        totalCount: totalCount || 0,
        reportCount: reportCount || 0,
    };
}
