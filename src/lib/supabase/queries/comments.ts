/**
 * Comments Query Functions
 *
 * 댓글 Supabase 쿼리
 */

import { createClient } from "../client";

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    parentId?: string;
    content: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt?: Date;
    // 조인된 사용자 정보 (선택적)
    user?: {
        id: string;
        nickname: string;
        profileImage?: string;
    };
}

export interface CreateCommentInput {
    postId: string;
    userId: string;
    content: string;
    parentId?: string;
}

/**
 * DB 레코드를 Comment로 변환
 */
function transformDbComment(dbComment: Record<string, unknown>): Comment {
    const user = dbComment.user as Record<string, unknown> | undefined;

    return {
        id: dbComment.id as string,
        postId: dbComment.post_id as string,
        userId: dbComment.user_id as string,
        parentId: dbComment.parent_id as string | undefined,
        content: dbComment.content as string,
        isDeleted: (dbComment.is_deleted as boolean) ?? false,
        createdAt: new Date(dbComment.created_at as string),
        updatedAt: dbComment.updated_at
            ? new Date(dbComment.updated_at as string)
            : undefined,
        user: user
            ? {
                  id: user.id as string,
                  nickname: user.nickname as string,
                  profileImage: user.profile_image as string | undefined,
              }
            : undefined,
    };
}

/**
 * 게시글의 모든 댓글 조회 (삭제되지 않은 것만)
 */
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comments")
        .select(
            `
            *,
            user:users(id, nickname, profile_image)
        `
        )
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("[getCommentsByPostId] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbComment);
}

/**
 * 게시글의 모든 댓글 조회 (삭제된 것 포함)
 */
export async function getAllCommentsByPostId(
    postId: string
): Promise<Comment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comments")
        .select(
            `
            *,
            user:users(id, nickname, profile_image)
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("[getAllCommentsByPostId] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbComment);
}

/**
 * 댓글 작성
 */
export async function createComment(
    input: CreateCommentInput
): Promise<Comment> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comments")
        .insert({
            post_id: input.postId,
            user_id: input.userId,
            content: input.content,
            parent_id: input.parentId,
        })
        .select(
            `
            *,
            user:users(id, nickname, profile_image)
        `
        )
        .single();

    if (error) {
        // UUID 형식이 아닌 경우 - Mock 데이터
        if (error.code === "22P02") {
            console.warn("[createComment] Invalid UUID format (mock data):", input.postId);
            throw error;
        }
        // FK 위반 (post가 존재하지 않음)
        if (error.code === "23503") {
            console.warn("[createComment] Post not found in DB (mock data):", input.postId);
            throw error;
        }
        console.error("[createComment] Error:", error);
        throw error;
    }

    return transformDbComment(data);
}

/**
 * 댓글 수정
 */
export async function updateComment(
    commentId: string,
    content: string
): Promise<Comment> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comments")
        .update({
            content,
            updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select(
            `
            *,
            user:users(id, nickname, profile_image)
        `
        )
        .single();

    if (error) {
        console.error("[updateComment] Error:", error);
        throw error;
    }

    return transformDbComment(data);
}

/**
 * 댓글 삭제 (소프트 삭제)
 */
export async function deleteComment(commentId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("comments")
        .update({
            is_deleted: true,
            updated_at: new Date().toISOString(),
        })
        .eq("id", commentId);

    if (error) {
        console.error("[deleteComment] Error:", error);
        throw error;
    }
}

/**
 * 댓글 하드 삭제 (관리자용)
 */
export async function hardDeleteComment(commentId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

    if (error) {
        console.error("[hardDeleteComment] Error:", error);
        throw error;
    }
}

/**
 * 게시글의 댓글 수 조회
 * 주의: posts 테이블의 comment_count 트리거가 자동 업데이트하므로
 * 가능하면 posts.comment_count를 직접 조회하는 것이 효율적
 */
export async function getCommentCount(postId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
        .eq("is_deleted", false);

    if (error) {
        console.error("[getCommentCount] Error:", error);
        throw error;
    }

    return count ?? 0;
}

/**
 * 사용자의 모든 댓글 조회
 */
export async function getCommentsByUserId(userId: string): Promise<Comment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comments")
        .select(
            `
            *,
            user:users(id, nickname, profile_image)
        `
        )
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getCommentsByUserId] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbComment);
}
