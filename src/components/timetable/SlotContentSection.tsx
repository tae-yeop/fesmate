"use client";

import { useState } from "react";
import { Play, Plus, ExternalLink, ThumbsUp, Trash2, X, Video, FileText, Sparkles } from "lucide-react";
import { Slot, SlotContent, SlotReviewType } from "@/types/event";
import { useSlotContent, SLOT_REVIEW_TYPE_CONFIG } from "@/lib/slot-content-context";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/date-format";
import { MOCK_USER_PROFILES } from "@/lib/mock-user-profiles";

interface SlotContentSectionProps {
    slot: Slot;
    /** 현재 사용자 ID */
    currentUserId?: string;
    className?: string;
}

/**
 * 슬롯 콘텐츠 섹션 (리뷰/영상 목록)
 */
export function SlotContentSection({ slot, currentUserId, className }: SlotContentSectionProps) {
    const { getSlotContents, toggleHelpful, isHelpful, getHelpfulCount, deleteContent } = useSlotContent();
    const [showAddModal, setShowAddModal] = useState(false);

    const contents = getSlotContents(slot.id);

    // 타입별 그룹화
    const reviews = contents.filter((c) => c.type === "review");
    const highlights = contents.filter((c) => c.type === "highlight");
    const fancams = contents.filter((c) => c.type === "fancam");

    const handleDelete = (contentId: string) => {
        if (confirm("정말 삭제하시겠습니까?")) {
            deleteContent(contentId);
        }
    };

    if (contents.length === 0) {
        return (
            <div className={cn("bg-white rounded-lg border border-gray-200 p-4", className)}>
                <div className="text-center py-6">
                    <p className="text-gray-500 text-sm mb-3">
                        아직 연결된 리뷰/영상이 없습니다
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                    >
                        <Plus className="h-4 w-4" />
                        콘텐츠 추가
                    </button>
                </div>

                {showAddModal && (
                    <AddContentModal
                        slotId={slot.id}
                        onClose={() => setShowAddModal(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">리뷰 & 영상</h4>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                    <Plus className="h-3 w-3" />
                    추가
                </button>
            </div>

            {/* 리뷰 */}
            {reviews.length > 0 && (
                <ContentGroup
                    type="review"
                    contents={reviews}
                    currentUserId={currentUserId}
                    onToggleHelpful={toggleHelpful}
                    isHelpful={isHelpful}
                    getHelpfulCount={getHelpfulCount}
                    onDelete={handleDelete}
                />
            )}

            {/* 하이라이트 */}
            {highlights.length > 0 && (
                <ContentGroup
                    type="highlight"
                    contents={highlights}
                    currentUserId={currentUserId}
                    onToggleHelpful={toggleHelpful}
                    isHelpful={isHelpful}
                    getHelpfulCount={getHelpfulCount}
                    onDelete={handleDelete}
                />
            )}

            {/* 직캠 */}
            {fancams.length > 0 && (
                <ContentGroup
                    type="fancam"
                    contents={fancams}
                    currentUserId={currentUserId}
                    onToggleHelpful={toggleHelpful}
                    isHelpful={isHelpful}
                    getHelpfulCount={getHelpfulCount}
                    onDelete={handleDelete}
                />
            )}

            {showAddModal && (
                <AddContentModal
                    slotId={slot.id}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}

interface ContentGroupProps {
    type: SlotReviewType;
    contents: SlotContent[];
    currentUserId?: string;
    onToggleHelpful: (contentId: string) => void;
    isHelpful: (contentId: string) => boolean;
    getHelpfulCount: (contentId: string, originalCount: number) => number;
    onDelete: (contentId: string) => void;
}

function ContentGroup({
    type,
    contents,
    currentUserId,
    onToggleHelpful,
    isHelpful,
    getHelpfulCount,
    onDelete,
}: ContentGroupProps) {
    const config = SLOT_REVIEW_TYPE_CONFIG[type];

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* 그룹 헤더 */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="text-sm font-medium text-gray-700">{config.label}</span>
                <span className="text-xs text-gray-500">({contents.length})</span>
            </div>

            {/* 콘텐츠 목록 */}
            <div className="divide-y divide-gray-100">
                {contents.map((content) => (
                    <ContentCard
                        key={content.id}
                        content={content}
                        currentUserId={currentUserId}
                        onToggleHelpful={() => onToggleHelpful(content.id)}
                        isHelpful={isHelpful(content.id)}
                        helpfulCount={getHelpfulCount(content.id, content.helpfulCount)}
                        onDelete={() => onDelete(content.id)}
                    />
                ))}
            </div>
        </div>
    );
}

interface ContentCardProps {
    content: SlotContent;
    currentUserId?: string;
    onToggleHelpful: () => void;
    isHelpful: boolean;
    helpfulCount: number;
    onDelete: () => void;
}

function ContentCard({
    content,
    currentUserId,
    onToggleHelpful,
    isHelpful,
    helpfulCount,
    onDelete,
}: ContentCardProps) {
    const author = MOCK_USER_PROFILES.find((u) => u.id === content.authorId);
    const isOwner = currentUserId === content.authorId;

    return (
        <div className="p-3 hover:bg-gray-50">
            <div className="flex gap-3">
                {/* 썸네일 */}
                {content.thumbnailUrl && (
                    <a
                        href={content.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative flex-shrink-0 w-24 h-16 bg-gray-200 rounded overflow-hidden group"
                    >
                        <img
                            src={content.thumbnailUrl}
                            alt={content.title || "영상"}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-6 w-6 text-white" fill="white" />
                        </div>
                    </a>
                )}

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                    {/* 제목 */}
                    <div className="flex items-start gap-2">
                        {content.youtubeUrl ? (
                            <a
                                href={content.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2"
                            >
                                {content.title || "영상 보기"}
                                <ExternalLink className="inline h-3 w-3 ml-1" />
                            </a>
                        ) : content.postId ? (
                            <a
                                href={`/post/${content.postId}`}
                                className="flex-1 text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2"
                            >
                                {content.title || "리뷰 보기"}
                            </a>
                        ) : (
                            <span className="flex-1 text-sm font-medium text-gray-900 line-clamp-2">
                                {content.title || "콘텐츠"}
                            </span>
                        )}
                    </div>

                    {/* 작성자 & 시간 */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{author?.nickname || "알 수 없음"}</span>
                        <span>·</span>
                        <span>{getRelativeTime(content.createdAt)}</span>
                    </div>

                    {/* 액션 */}
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={onToggleHelpful}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
                                isHelpful
                                    ? "text-indigo-600 bg-indigo-50"
                                    : "text-gray-500 hover:bg-gray-100"
                            )}
                        >
                            <ThumbsUp className={cn("h-3 w-3", isHelpful && "fill-current")} />
                            <span>{helpfulCount}</span>
                        </button>

                        {isOwner && (
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface AddContentModalProps {
    slotId: string;
    onClose: () => void;
}

function AddContentModal({ slotId, onClose }: AddContentModalProps) {
    const { addContent } = useSlotContent();
    const [type, setType] = useState<SlotReviewType>("fancam");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (type === "review") {
            alert("리뷰 연결은 글 작성 후 해당 슬롯을 태그해주세요.");
            return;
        }

        if (!youtubeUrl.trim()) {
            alert("YouTube URL을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = addContent(slotId, {
                type,
                youtubeUrl: youtubeUrl.trim(),
                title: title.trim() || undefined,
            });

            if (result) {
                onClose();
            } else {
                alert("콘텐츠 추가에 실패했습니다.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 오버레이 */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* 모달 */}
            <div className="relative bg-white rounded-xl max-w-md w-full">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold">콘텐츠 추가</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* 타입 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            콘텐츠 타입
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["review", "highlight", "fancam"] as const).map((t) => {
                                const config = SLOT_REVIEW_TYPE_CONFIG[t];
                                const Icon = t === "review" ? FileText : t === "highlight" ? Sparkles : Video;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 p-3 border rounded-lg transition-colors",
                                            type === t
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-xs font-medium">{config.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 리뷰 안내 */}
                    {type === "review" && (
                        <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-700">
                                리뷰는 커뮤니티에서 글 작성 시 해당 슬롯을 태그하면 자동으로 연결됩니다.
                            </p>
                        </div>
                    )}

                    {/* YouTube URL */}
                    {type !== "review" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    YouTube URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    제목 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="영상 제목을 입력하세요"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </>
                    )}

                    {/* 버튼 */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            취소
                        </button>
                        {type !== "review" && (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isSubmitting ? "추가 중..." : "추가하기"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
