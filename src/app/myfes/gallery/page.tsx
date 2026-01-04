"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Plus,
    Trash2,
    GripVertical,
    ImagePlus,
    Link2,
    Instagram,
    Globe,
    Lock,
    Check,
    Share2,
    ExternalLink,
    Loader2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGallery } from "@/lib/gallery-context";
import { useTicketBook } from "@/lib/ticketbook-context";
import { detectPlatform, isValidSocialUrl, getPlatformName, getPlatformColor } from "@/lib/utils/oembed";
import { formatKoreanDate } from "@/lib/utils/date-format";
import type { GalleryItem, PhotoGalleryItem, InstagramGalleryItem, TwitterGalleryItem } from "@/types/gallery";

type AddItemType = "ticket" | "photo" | "sns";

function GalleryEditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const galleryId = searchParams.get("id");

    const { getGalleryById, updateGallery, addItem, removeItem, togglePublic, generateShareUrl } = useGallery();
    const { tickets } = useTicketBook();

    const [gallery, setGallery] = useState(() => galleryId ? getGalleryById(galleryId) : null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [addItemType, setAddItemType] = useState<AddItemType | null>(null);
    const [snsUrl, setSnsUrl] = useState("");
    const [snsError, setSnsError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // 갤러리 데이터 동기화
    useEffect(() => {
        if (galleryId) {
            const updated = getGalleryById(galleryId);
            setGallery(updated);
        }
    }, [galleryId, getGalleryById]);

    // 아이템 추가: 티켓
    const handleAddTicket = useCallback((ticketId: string) => {
        if (!gallery) return;
        addItem(gallery.id, { type: "ticket", ticketId });
        setAddItemType(null);
    }, [gallery, addItem]);

    // 아이템 추가: 사진
    const handleAddPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!gallery || !e.target.files?.[0]) return;

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            addItem(gallery.id, {
                type: "photo",
                imageUrl,
            });
        };
        reader.readAsDataURL(file);
        setAddItemType(null);
    }, [gallery, addItem]);

    // 아이템 추가: SNS
    const handleAddSns = useCallback(() => {
        if (!gallery || !snsUrl.trim()) return;

        const platform = detectPlatform(snsUrl);
        if (!platform) {
            setSnsError("Instagram 또는 Twitter/X URL만 지원합니다");
            return;
        }

        addItem(gallery.id, {
            type: platform,
            embedUrl: snsUrl,
        });

        setSnsUrl("");
        setSnsError(null);
        setAddItemType(null);
    }, [gallery, snsUrl, addItem]);

    // 아이템 삭제
    const handleRemoveItem = useCallback((itemId: string) => {
        if (!gallery) return;
        removeItem(gallery.id, itemId);
    }, [gallery, removeItem]);

    // 공개/비공개 토글
    const handleTogglePublic = useCallback(() => {
        if (!gallery) return;
        togglePublic(gallery.id);
    }, [gallery, togglePublic]);

    // 공유 URL 생성
    const handleShare = useCallback(() => {
        if (!gallery) return;
        const url = generateShareUrl(gallery.id);
        setShareUrl(url);
    }, [gallery, generateShareUrl]);

    // URL 복사
    const handleCopyUrl = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("[GalleryEditor] Copy failed:", error);
        }
    }, [shareUrl]);

    // 제목 업데이트
    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!gallery) return;
        updateGallery(gallery.id, { title: e.target.value });
    }, [gallery, updateGallery]);

    // 설명 업데이트
    const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!gallery) return;
        updateGallery(gallery.id, { description: e.target.value });
    }, [gallery, updateGallery]);

    // 갤러리가 없으면 404
    if (!gallery) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl font-bold mb-2">갤러리를 찾을 수 없습니다</p>
                    <Link href="/myfes" className="text-primary hover:underline">
                        돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    // 아직 추가되지 않은 티켓 목록
    const addedTicketIds = gallery.items
        .filter((item): item is GalleryItem & { type: "ticket" } => item.type === "ticket")
        .map((item) => item.ticketId);
    const availableTickets = tickets.filter((t) => !addedTicketIds.includes(t.id));

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">갤러리 편집</span>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Share2 className="h-4 w-4" />
                        공유
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6 space-y-6">
                {/* 기본 정보 */}
                <section className="space-y-4">
                    <input
                        type="text"
                        value={gallery.title}
                        onChange={handleTitleChange}
                        placeholder="갤러리 제목"
                        className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                    />
                    <textarea
                        value={gallery.description || ""}
                        onChange={handleDescriptionChange}
                        placeholder="갤러리 설명 (선택)"
                        className="w-full text-muted-foreground bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-muted-foreground"
                        rows={2}
                    />

                    {/* 공개 설정 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                            {gallery.isPublic ? (
                                <Globe className="h-5 w-5 text-primary" />
                            ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                                <p className="font-medium text-sm">
                                    {gallery.isPublic ? "공개" : "비공개"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {gallery.isPublic
                                        ? "링크가 있는 누구나 볼 수 있어요"
                                        : "나만 볼 수 있어요"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePublic}
                            className={cn(
                                "relative w-12 h-6 rounded-full transition-colors",
                                gallery.isPublic ? "bg-primary" : "bg-muted"
                            )}
                        >
                            <div
                                className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                    gallery.isPublic ? "translate-x-7" : "translate-x-1"
                                )}
                            />
                        </button>
                    </div>
                </section>

                {/* 공유 URL */}
                {shareUrl && (
                    <section className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">공유 URL이 생성되었습니다</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={`${window.location.origin}${shareUrl}`}
                                readOnly
                                className="flex-1 px-3 py-2 text-sm rounded-lg bg-background border"
                            />
                            <button
                                onClick={handleCopyUrl}
                                className={cn(
                                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                                    copied
                                        ? "bg-green-600 text-white"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                            >
                                {copied ? "복사됨!" : "복사"}
                            </button>
                            <Link
                                href={shareUrl}
                                target="_blank"
                                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                        </div>
                    </section>
                )}

                {/* 아이템 목록 */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">
                            콘텐츠 ({gallery.items.length})
                        </h2>
                        <button
                            onClick={() => setShowAddMenu(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            추가
                        </button>
                    </div>

                    {gallery.items.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ImagePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>아직 콘텐츠가 없습니다</p>
                            <p className="text-sm">티켓, 사진, SNS 포스트를 추가해보세요</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {gallery.items
                                .sort((a, b) => a.order - b.order)
                                .map((item) => (
                                    <GalleryItemCard
                                        key={item.id}
                                        item={item}
                                        tickets={tickets}
                                        onRemove={() => handleRemoveItem(item.id)}
                                    />
                                ))}
                        </div>
                    )}
                </section>
            </main>

            {/* 추가 메뉴 모달 */}
            {showAddMenu && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/60"
                        onClick={() => {
                            setShowAddMenu(false);
                            setAddItemType(null);
                        }}
                    />
                    <div className="fixed inset-x-4 bottom-4 z-50 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md">
                        <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold">
                                    {!addItemType ? "콘텐츠 추가" :
                                        addItemType === "ticket" ? "티켓 선택" :
                                        addItemType === "photo" ? "사진 업로드" : "SNS 포스트 추가"}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddMenu(false);
                                        setAddItemType(null);
                                    }}
                                    className="p-2 rounded-full hover:bg-muted transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {!addItemType && (
                                <div className="p-4 space-y-2">
                                    <button
                                        onClick={() => setAddItemType("ticket")}
                                        disabled={availableTickets.length === 0}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-xl transition-colors",
                                            availableTickets.length === 0
                                                ? "bg-muted/30 text-muted-foreground cursor-not-allowed"
                                                : "bg-muted/50 hover:bg-muted"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-lg">🎫</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">티켓</p>
                                            <p className="text-xs text-muted-foreground">
                                                티켓북에서 티켓 선택 ({availableTickets.length}개 가능)
                                            </p>
                                        </div>
                                    </button>

                                    <label className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <ImagePlus className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">사진</p>
                                            <p className="text-xs text-muted-foreground">
                                                공연/페스티벌 사진 업로드
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAddPhoto}
                                            className="hidden"
                                        />
                                    </label>

                                    <button
                                        onClick={() => setAddItemType("sns")}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] to-[#FCAF45] flex items-center justify-center text-white">
                                            <Instagram className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">SNS 포스트</p>
                                            <p className="text-xs text-muted-foreground">
                                                Instagram, Twitter/X URL 붙여넣기
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {addItemType === "ticket" && (
                                <div className="p-4 max-h-[60vh] overflow-y-auto">
                                    {availableTickets.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">
                                            추가할 수 있는 티켓이 없습니다
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {availableTickets.map((ticket) => (
                                                <button
                                                    key={ticket.id}
                                                    onClick={() => handleAddTicket(ticket.id)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                                >
                                                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={ticket.frontImage.thumbnailUrl || ticket.frontImage.url}
                                                            alt={ticket.eventTitle}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="font-medium truncate">{ticket.eventTitle}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatKoreanDate(ticket.eventDate, "YYYY.MM.DD")}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setAddItemType(null)}
                                        className="w-full mt-4 py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                                    >
                                        뒤로
                                    </button>
                                </div>
                            )}

                            {addItemType === "sns" && (
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            SNS URL
                                        </label>
                                        <input
                                            type="url"
                                            value={snsUrl}
                                            onChange={(e) => {
                                                setSnsUrl(e.target.value);
                                                setSnsError(null);
                                            }}
                                            placeholder="https://instagram.com/p/... 또는 https://x.com/.../status/..."
                                            className="w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        {snsError && (
                                            <p className="text-sm text-red-500 mt-1">{snsError}</p>
                                        )}
                                        {snsUrl && isValidSocialUrl(snsUrl) && (
                                            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                                <Check className="h-4 w-4" />
                                                {getPlatformName(detectPlatform(snsUrl)!)} 포스트
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setAddItemType(null)}
                                            className="flex-1 py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleAddSns}
                                            disabled={!isValidSocialUrl(snsUrl)}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-medium transition-colors",
                                                isValidSocialUrl(snsUrl)
                                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                            )}
                                        >
                                            추가
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/** 갤러리 아이템 카드 */
function GalleryItemCard({
    item,
    tickets,
    onRemove,
}: {
    item: GalleryItem;
    tickets: { id: string; frontImage: { url: string; thumbnailUrl: string }; eventTitle: string; eventDate: Date }[];
    onRemove: () => void;
}) {
    const getItemPreview = () => {
        switch (item.type) {
            case "ticket": {
                const ticketItem = item as GalleryItem & { type: "ticket"; ticketId: string };
                const ticket = tickets.find((t) => t.id === ticketItem.ticketId);
                if (!ticket) return { icon: "🎫", title: "삭제된 티켓", subtitle: "" };
                return {
                    image: ticket.frontImage.thumbnailUrl || ticket.frontImage.url,
                    title: ticket.eventTitle,
                    subtitle: formatKoreanDate(ticket.eventDate, "YYYY.MM.DD"),
                };
            }
            case "photo": {
                const photoItem = item as PhotoGalleryItem;
                return {
                    image: photoItem.thumbnailUrl || photoItem.imageUrl,
                    title: photoItem.caption || "사진",
                    subtitle: photoItem.eventTitle || "",
                };
            }
            case "instagram": {
                const igItem = item as InstagramGalleryItem;
                return {
                    icon: <Instagram className="h-5 w-5" style={{ color: getPlatformColor("instagram") }} />,
                    title: igItem.authorName || "Instagram 포스트",
                    subtitle: igItem.embedUrl,
                };
            }
            case "twitter": {
                const twItem = item as TwitterGalleryItem;
                return {
                    icon: <span className="text-lg font-bold" style={{ color: getPlatformColor("twitter") }}>𝕏</span>,
                    title: twItem.authorHandle ? `@${twItem.authorHandle}` : "Twitter 포스트",
                    subtitle: twItem.content || twItem.embedUrl,
                };
            }
        }
    };

    const preview = getItemPreview();

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <div className="cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                {preview.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={preview.image}
                        alt={preview.title}
                        className="w-full h-full object-cover"
                    />
                ) : preview.icon ? (
                    typeof preview.icon === "string" ? (
                        <span className="text-xl">{preview.icon}</span>
                    ) : (
                        preview.icon
                    )
                ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{preview.title}</p>
                <p className="text-xs text-muted-foreground truncate">{preview.subtitle}</p>
            </div>

            <button
                onClick={onRemove}
                className="p-2 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

/**
 * 갤러리 편집 페이지
 * - 티켓/사진/SNS 포스트 추가
 * - 순서 변경 (드래그앤드롭)
 * - 공개/비공개 설정
 * - 공유 URL 생성
 */
export default function GalleryEditorPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <GalleryEditorContent />
        </Suspense>
    );
}
