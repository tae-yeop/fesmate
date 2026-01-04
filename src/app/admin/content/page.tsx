"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCw,
    Search,
    FileText,
    MessageSquare,
    Trash2,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    User,
    Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getPosts,
    getComments,
    adminDeletePost,
    adminDeleteComment,
} from "@/lib/supabase/queries";

// =============================================
// Types
// =============================================

type ContentTab = "posts" | "comments";

interface PostRow {
    id: string;
    content: string;
    type: string;
    event_id: string | null;
    created_at: string;
    users?: {
        nickname: string;
        avatar_url: string | null;
    } | null;
}

interface CommentRow {
    id: string;
    content: string;
    post_id: string;
    created_at: string;
    users?: {
        nickname: string;
        avatar_url: string | null;
    } | null;
}

// =============================================
// Main Component
// =============================================

export default function ContentManagementPage() {
    const [activeTab, setActiveTab] = useState<ContentTab>("posts");
    const [posts, setPosts] = useState<PostRow[]>([]);
    const [comments, setComments] = useState<CommentRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<{ type: ContentTab; id: string; preview: string } | null>(null);

    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchData();
    }, [activeTab, currentPage]);

    async function fetchData() {
        setIsLoading(true);
        try {
            if (activeTab === "posts") {
                const { data, count } = await getPosts({
                    search: searchQuery || undefined,
                    limit: PAGE_SIZE,
                    offset: currentPage * PAGE_SIZE,
                });
                setPosts(data as unknown as PostRow[]);
                setTotalCount(count);
            } else {
                const { data, count } = await getComments({
                    search: searchQuery || undefined,
                    limit: PAGE_SIZE,
                    offset: currentPage * PAGE_SIZE,
                });
                setComments(data as unknown as CommentRow[]);
                setTotalCount(count);
            }
        } catch (error) {
            console.error("[ContentManagementPage] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSearch() {
        setCurrentPage(0);
        fetchData();
    }

    function handleTabChange(tab: ContentTab) {
        setActiveTab(tab);
        setCurrentPage(0);
        setSearchQuery("");
    }

    async function handleDelete(reason: string) {
        if (!deleteTarget) return;

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (deleteTarget.type === "posts") {
                await adminDeletePost(user.id, deleteTarget.id, reason);
            } else {
                await adminDeleteComment(user.id, deleteTarget.id, reason);
            }

            setDeleteTarget(null);
            fetchData();
        } catch (error) {
            console.error("[ContentManagementPage] Error deleting:", error);
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (isLoading && posts.length === 0 && comments.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">콘텐츠 관리</h1>
                <p className="text-muted-foreground">
                    글과 댓글을 관리합니다.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => handleTabChange("posts")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
                        activeTab === "posts"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <FileText className="h-4 w-4" />
                    글
                </button>
                <button
                    onClick={() => handleTabChange("comments")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
                        activeTab === "comments"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <MessageSquare className="h-4 w-4" />
                    댓글
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder={activeTab === "posts" ? "글 내용으로 검색..." : "댓글 내용으로 검색..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            {/* Content */}
            {activeTab === "posts" ? (
                <PostsTable
                    posts={posts}
                    onDelete={(post) => setDeleteTarget({
                        type: "posts",
                        id: post.id,
                        preview: post.content.slice(0, 50),
                    })}
                />
            ) : (
                <CommentsTable
                    comments={comments}
                    onDelete={(comment) => setDeleteTarget({
                        type: "comments",
                        id: comment.id,
                        preview: comment.content.slice(0, 50),
                    })}
                />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        총 {totalCount}건
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <DeleteConfirmModal
                    contentType={deleteTarget.type === "posts" ? "글" : "댓글"}
                    preview={deleteTarget.preview}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}

// =============================================
// Posts Table
// =============================================

function PostsTable({
    posts,
    onDelete,
}: {
    posts: PostRow[];
    onDelete: (post: PostRow) => void;
}) {
    if (posts.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                글이 없습니다.
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="text-left p-3 text-sm font-medium">작성자</th>
                        <th className="text-left p-3 text-sm font-medium">내용</th>
                        <th className="text-left p-3 text-sm font-medium">유형</th>
                        <th className="text-left p-3 text-sm font-medium">작성일</th>
                        <th className="text-left p-3 text-sm font-medium">작업</th>
                    </tr>
                </thead>
                <tbody>
                    {posts.map((post) => (
                        <tr key={post.id} className="border-t hover:bg-muted/30">
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    {post.users?.avatar_url ? (
                                        <img
                                            src={post.users.avatar_url}
                                            alt=""
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    )}
                                    <span className="text-sm">{post.users?.nickname || "Unknown"}</span>
                                </div>
                            </td>
                            <td className="p-3">
                                <p className="text-sm line-clamp-2 max-w-md">{post.content}</p>
                            </td>
                            <td className="p-3">
                                <span className="text-xs px-2 py-1 bg-muted rounded">{post.type}</span>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                                {formatDate(post.created_at)}
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => onDelete(post)}
                                    className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                    title="삭제"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// =============================================
// Comments Table
// =============================================

function CommentsTable({
    comments,
    onDelete,
}: {
    comments: CommentRow[];
    onDelete: (comment: CommentRow) => void;
}) {
    if (comments.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                댓글이 없습니다.
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="text-left p-3 text-sm font-medium">작성자</th>
                        <th className="text-left p-3 text-sm font-medium">내용</th>
                        <th className="text-left p-3 text-sm font-medium">작성일</th>
                        <th className="text-left p-3 text-sm font-medium">작업</th>
                    </tr>
                </thead>
                <tbody>
                    {comments.map((comment) => (
                        <tr key={comment.id} className="border-t hover:bg-muted/30">
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    {comment.users?.avatar_url ? (
                                        <img
                                            src={comment.users.avatar_url}
                                            alt=""
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    )}
                                    <span className="text-sm">{comment.users?.nickname || "Unknown"}</span>
                                </div>
                            </td>
                            <td className="p-3">
                                <p className="text-sm line-clamp-2 max-w-md">{comment.content}</p>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                                {formatDate(comment.created_at)}
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => onDelete(comment)}
                                    className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                    title="삭제"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// =============================================
// Delete Confirm Modal
// =============================================

interface DeleteConfirmModalProps {
    contentType: string;
    preview: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

function DeleteConfirmModal({ contentType, preview, onClose, onConfirm }: DeleteConfirmModalProps) {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleConfirm() {
        if (!reason.trim()) return;
        setIsSubmitting(true);
        await onConfirm(reason);
        setIsSubmitting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-background rounded-lg shadow-lg p-4 space-y-4">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold">{contentType} 삭제</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                        이 {contentType}을(를) 삭제하시겠습니까?
                    </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="text-muted-foreground line-clamp-2">&quot;{preview}...&quot;</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">삭제 사유</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="삭제 사유를 입력하세요..."
                        className="w-full h-20 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg font-medium border hover:bg-muted"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >
                        {isSubmitting ? "삭제 중..." : "삭제"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}
