import { PostType } from "@/types/post";
import {
  PostDraft,
  CommentDraft,
  Draft,
  OFFLINE_CONFIG,
} from "./types";
import {
  saveDraft,
  getDraft,
  deleteDraft,
  getPostDraftsByUser,
  getDraftsByUser,
} from "./indexed-db";

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + OFFLINE_CONFIG.DRAFT_RETENTION_DAYS);
  return date;
}

export interface CreatePostDraftParams {
  userId: string | null;
  eventId?: string | null;
  postType?: PostType | null;
  content?: string;
  meetTime?: string;
  placeText?: string;
  placeHint?: string;
  maxPeople?: number;
  videoUrl?: string;
  rating?: number;
  imageUrls?: string[];
}

export async function createPostDraft(
  params: CreatePostDraftParams
): Promise<PostDraft> {
  const draft: PostDraft = {
    id: generateId(),
    type: "post",
    savedAt: new Date(),
    expiresAt: getExpirationDate(),
    userId: params.userId,
    eventId: params.eventId ?? null,
    postType: params.postType ?? null,
    content: params.content ?? "",
    meetTime: params.meetTime,
    placeText: params.placeText,
    placeHint: params.placeHint,
    maxPeople: params.maxPeople,
    videoUrl: params.videoUrl,
    rating: params.rating,
    imageUrls: params.imageUrls,
  };

  await saveDraft(draft);
  return draft;
}

export async function updatePostDraft(
  id: string,
  updates: Partial<Omit<PostDraft, "id" | "type" | "savedAt" | "expiresAt">>
): Promise<PostDraft | null> {
  const existing = await getDraft(id);
  if (!existing || existing.type !== "post") return null;

  const updated: PostDraft = {
    ...existing,
    ...updates,
    savedAt: new Date(),
    expiresAt: getExpirationDate(),
  };

  await saveDraft(updated);
  return updated;
}

export interface CreateCommentDraftParams {
  userId: string | null;
  postId: string;
  parentId?: string;
  content?: string;
}

export async function createCommentDraft(
  params: CreateCommentDraftParams
): Promise<CommentDraft> {
  const draft: CommentDraft = {
    id: generateId(),
    type: "comment",
    savedAt: new Date(),
    expiresAt: getExpirationDate(),
    userId: params.userId,
    postId: params.postId,
    parentId: params.parentId,
    content: params.content ?? "",
  };

  await saveDraft(draft);
  return draft;
}

export async function updateCommentDraft(
  id: string,
  updates: Partial<Omit<CommentDraft, "id" | "type" | "savedAt" | "expiresAt">>
): Promise<CommentDraft | null> {
  const existing = await getDraft(id);
  if (!existing || existing.type !== "comment") return null;

  const updated: CommentDraft = {
    ...existing,
    ...updates,
    savedAt: new Date(),
    expiresAt: getExpirationDate(),
  };

  await saveDraft(updated);
  return updated;
}

export async function getOrCreatePostDraft(
  userId: string | null,
  eventId?: string | null
): Promise<PostDraft> {
  const drafts = await getPostDraftsByUser(userId);
  
  const existingDraft = drafts.find(
    (d) => d.type === "post" && d.eventId === eventId
  ) as PostDraft | undefined;

  if (existingDraft) {
    return existingDraft;
  }

  return createPostDraft({ userId, eventId });
}

export async function getAllDrafts(userId: string | null): Promise<Draft[]> {
  return getDraftsByUser(userId);
}

export async function getPostDrafts(userId: string | null): Promise<PostDraft[]> {
  const drafts = await getPostDraftsByUser(userId);
  return drafts.filter((d): d is PostDraft => d.type === "post");
}

export async function getCommentDrafts(
  userId: string | null,
  postId?: string
): Promise<CommentDraft[]> {
  const drafts = await getDraftsByUser(userId);
  const commentDrafts = drafts.filter(
    (d): d is CommentDraft => d.type === "comment"
  );

  if (postId) {
    return commentDrafts.filter((d) => d.postId === postId);
  }

  return commentDrafts;
}

export async function removeDraft(id: string): Promise<void> {
  await deleteDraft(id);
}

export function isDraftEmpty(draft: Draft): boolean {
  if (draft.type === "post") {
    const postDraft = draft as PostDraft;
    return (
      !postDraft.content?.trim() &&
      !postDraft.meetTime &&
      !postDraft.placeText &&
      !postDraft.videoUrl &&
      (!postDraft.imageUrls || postDraft.imageUrls.length === 0)
    );
  }

  if (draft.type === "comment") {
    const commentDraft = draft as CommentDraft;
    return !commentDraft.content?.trim();
  }

  return true;
}

export function formatDraftAge(savedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - savedAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
}
