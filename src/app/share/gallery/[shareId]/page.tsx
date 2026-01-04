"use client";

import { useState, useEffect, use, useMemo, useRef } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    Eye,
    Calendar,
    Share2,
    Instagram,
    ExternalLink,
    ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicketBook } from "@/lib/ticketbook-context";
import { loadEmbedScripts, refreshEmbeds, getPlatformColor } from "@/lib/utils/oembed";
import { formatKoreanDate } from "@/lib/utils/date-format";
import { createSharedAdapter, DOMAINS } from "@/lib/storage";
import type {
    Gallery,
    GalleryItem,
    TicketGalleryItem,
    PhotoGalleryItem,
    InstagramGalleryItem,
    TwitterGalleryItem,
} from "@/types/gallery";
import type { Ticket } from "@/types/ticketbook";

/** localStorage에서 갤러리 직접 로드 */
const galleriesAdapter = createSharedAdapter<Gallery[]>({
    domain: DOMAINS.GALLERIES,
    dateFields: ["createdAt", "updatedAt"],
    nestedDateFields: ["items.createdAt", "items.takenAt", "items.ticketSnapshot.eventDate"],
});

interface PageProps {
    params: Promise<{ shareId: string }>;
}

/** 아이템에서 날짜 추출 */
function getItemDate(item: GalleryItem, tickets: Ticket[]): Date {
    if (item.type === "ticket") {
        const ticketItem = item as TicketGalleryItem;
        if (ticketItem.ticketSnapshot?.eventDate) {
            return new Date(ticketItem.ticketSnapshot.eventDate);
        }
        const ticket = tickets.find((t) => t.id === ticketItem.ticketId);
        if (ticket?.eventDate) {
            return new Date(ticket.eventDate);
        }
    }
    if (item.type === "photo") {
        const photoItem = item as PhotoGalleryItem;
        if (photoItem.takenAt) {
            return new Date(photoItem.takenAt);
        }
    }
    return new Date(item.createdAt);
}

/** 년/월 키 생성 */
function getYearMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** 년/월별 그룹화된 아이템 */
interface GroupedItems {
    year: number;
    month: number;
    key: string;
    items: GalleryItem[];
}

/**
 * 공유 갤러리 페이지
 * - 타임라인 형식의 년/월별 그룹화
 * - 왼쪽 세로 타임라인 + 배지
 * - 오른쪽 빠른 네비게이션
 * - 라이트박스 지원
 */
export default function SharedGalleryPage({ params }: PageProps) {
    const { shareId } = use(params);
    const { tickets } = useTicketBook();

    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeYearMonth, setActiveYearMonth] = useState<string | null>(null);

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // 갤러리 로드 (localStorage에서 직접)
    useEffect(() => {
        // 개발 모드에서 test- 로 시작하면 Mock 데이터 사용
        if (shareId.startsWith("test-")) {
            setGallery(createMockGallery(shareId));
            setIsLoading(false);
            return;
        }

        // localStorage에서 직접 갤러리 로드
        const galleries = galleriesAdapter.get() || [];
        const found = galleries.find((g) => g.shareId === shareId && g.isPublic);

        console.log("[SharedGalleryPage] Looking for shareId:", shareId);
        console.log("[SharedGalleryPage] Found galleries:", galleries.length);
        console.log("[SharedGalleryPage] Found gallery:", found?.id);

        setGallery(found || null);
        setIsLoading(false);
    }, [shareId]);

    // 아이템을 년/월별로 그룹화
    const groupedItems = useMemo(() => {
        if (!gallery) return [];

        const groups = new Map<string, GroupedItems>();

        gallery.items.forEach((item) => {
            const date = getItemDate(item, tickets);
            const key = getYearMonthKey(date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            if (!groups.has(key)) {
                groups.set(key, { year, month, key, items: [] });
            }
            groups.get(key)!.items.push(item);
        });

        // 날짜순 정렬 (최신순)
        return Array.from(groups.values()).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [gallery, tickets]);

    // 년도별 그룹화 (네비게이션용)
    const yearGroups = useMemo(() => {
        const years = new Map<number, number[]>();
        groupedItems.forEach((group) => {
            if (!years.has(group.year)) {
                years.set(group.year, []);
            }
            years.get(group.year)!.push(group.month);
        });
        return Array.from(years.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([year, months]) => ({
                year,
                months: months.sort((a, b) => b - a),
            }));
    }, [groupedItems]);

    // 스크롤 시 현재 보이는 섹션 감지
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const key = entry.target.getAttribute("data-key");
                        if (key) setActiveYearMonth(key);
                    }
                });
            },
            { threshold: 0.3, rootMargin: "-100px 0px -50% 0px" }
        );

        sectionRefs.current.forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, [groupedItems]);

    // 섹션으로 스크롤
    const scrollToSection = (key: string) => {
        const el = sectionRefs.current.get(key);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // SNS 임베드 스크립트 로드
    useEffect(() => {
        if (gallery && gallery.items.some((item) => item.type === "instagram" || item.type === "twitter")) {
            loadEmbedScripts();
            setTimeout(refreshEmbeds, 500);
        }
    }, [gallery]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!gallery) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </span>
                    </Link>
                    <button className="p-2 rounded-full hover:bg-muted transition-colors">
                        <Share2 className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Title Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">{gallery.title}</h1>
                    {gallery.description && (
                        <p className="text-muted-foreground mb-4">{gallery.description}</p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatKoreanDate(gallery.createdAt, "YYYY년 M월 D일")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{gallery.viewCount.toLocaleString()}회 조회</span>
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {gallery.items.length}개 콘텐츠
                        </div>
                    </div>
                </div>

                {/* Timeline Layout */}
                <div className="relative flex gap-4 lg:gap-8">
                    {/* Left Timeline */}
                    <div className="hidden sm:block w-16 lg:w-20 flex-shrink-0">
                        {/* 타임라인 세로선 */}
                        <div className="absolute left-8 lg:left-10 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-8">
                        {groupedItems.map((group, groupIndex) => (
                            <div
                                key={group.key}
                                ref={(el) => {
                                    if (el) sectionRefs.current.set(group.key, el);
                                }}
                                data-key={group.key}
                                className="relative"
                            >
                                {/* 년/월 배지 - 왼쪽에 표시 */}
                                <div className="flex items-start gap-4 mb-4">
                                    {/* 년도가 바뀌면 년도 배지 표시 */}
                                    {(groupIndex === 0 || groupedItems[groupIndex - 1].year !== group.year) && (
                                        <div className="hidden sm:flex absolute -left-16 lg:-left-20 items-center justify-center">
                                            <div className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-lg">
                                                {group.year}
                                            </div>
                                        </div>
                                    )}

                                    {/* 월 배지 */}
                                    <div className="hidden sm:flex absolute -left-16 lg:-left-20 top-10 items-center justify-center">
                                        <div className="relative flex items-center">
                                            {/* 타임라인 점 */}
                                            <div className="absolute -right-[2.125rem] lg:-right-[2.625rem] w-3 h-3 rounded-full bg-primary border-2 border-background shadow" />
                                            <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20">
                                                {group.month}월
                                            </div>
                                        </div>
                                    </div>

                                    {/* 모바일: 년/월 표시 */}
                                    <div className="sm:hidden flex items-center gap-2 mb-2">
                                        {(groupIndex === 0 || groupedItems[groupIndex - 1].year !== group.year) && (
                                            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold text-xs">
                                                {group.year}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs">
                                            {group.month}월
                                        </span>
                                    </div>
                                </div>

                                {/* 그룹 내 아이템들 */}
                                <div className="space-y-6 sm:pl-4">
                                    {group.items
                                        .sort((a, b) => a.order - b.order)
                                        .map((item) => (
                                            <GalleryItemRenderer
                                                key={item.id}
                                                item={item}
                                                tickets={tickets}
                                                onImageClick={setSelectedImage}
                                            />
                                        ))}
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {gallery.items.length === 0 && (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">📷</div>
                                <h3 className="text-xl font-bold mb-2">콘텐츠가 없습니다</h3>
                                <p className="text-muted-foreground">
                                    아직 추가된 콘텐츠가 없습니다.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Navigation - 년도/월 빠른 이동 */}
                    <div className="hidden lg:block w-20 flex-shrink-0">
                        <div className="sticky top-24 space-y-4">
                            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                연도
                            </div>
                            {yearGroups.map(({ year, months }) => (
                                <div key={year} className="space-y-1">
                                    {/* 년도 버튼 */}
                                    <button
                                        onClick={() => scrollToSection(`${year}-${String(months[0]).padStart(2, "0")}`)}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-sm font-bold rounded-lg transition-colors text-left",
                                            activeYearMonth?.startsWith(`${year}-`)
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted hover:bg-muted/80 text-foreground"
                                        )}
                                    >
                                        {String(year).slice(2)}
                                    </button>
                                    {/* 월 버튼들 */}
                                    <div className="grid grid-cols-3 gap-0.5">
                                        {months.map((month) => {
                                            const key = `${year}-${String(month).padStart(2, "0")}`;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => scrollToSection(key)}
                                                    className={cn(
                                                        "px-1.5 py-1 text-xs rounded transition-colors",
                                                        activeYearMonth === key
                                                            ? "bg-primary/20 text-primary font-medium"
                                                            : "hover:bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {month}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* 맨 위로 버튼 */}
                            <button
                                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                                className="w-full mt-4 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center gap-1 text-xs text-muted-foreground"
                            >
                                <ChevronUp className="h-3 w-3" />
                                TOP
                            </button>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <p className="text-muted-foreground mb-4">
                        나만의 공연 갤러리를 만들어보세요
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        FesMate 시작하기
                    </Link>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            {yearGroups.length > 1 && (
                <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                    <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-background/95 backdrop-blur border shadow-lg">
                        {yearGroups.map(({ year, months }) => (
                            <button
                                key={year}
                                onClick={() => scrollToSection(`${year}-${String(months[0]).padStart(2, "0")}`)}
                                className={cn(
                                    "px-3 py-1 text-sm font-medium rounded-full transition-colors",
                                    activeYearMonth?.startsWith(`${year}-`)
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={selectedImage}
                        alt="확대 이미지"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <span className="sr-only">닫기</span>
                        ✕
                    </button>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t py-8 mt-16">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </span>
                        {" - "}공연과 페스티벌의 모든 것
                    </p>
                </div>
            </footer>
        </div>
    );
}

/** 갤러리 아이템 렌더러 */
function GalleryItemRenderer({
    item,
    tickets,
    onImageClick,
}: {
    item: GalleryItem;
    tickets: Ticket[];
    onImageClick: (url: string) => void;
}) {
    switch (item.type) {
        case "ticket": {
            const ticketItem = item as TicketGalleryItem;
            const snapshot = ticketItem.ticketSnapshot;
            const ticket = tickets.find((t) => t.id === ticketItem.ticketId);

            // 스냅샷 우선, 없으면 Context에서 찾기
            const eventTitle = snapshot?.eventTitle || ticket?.eventTitle;
            const eventDate = snapshot?.eventDate || ticket?.eventDate;
            const seat = snapshot?.seat || ticket?.seat;
            const imageUrl = snapshot?.frontImageUrl || ticket?.frontImage.url;
            const thumbnailUrl = snapshot?.frontImageThumbnailUrl || ticket?.frontImage.thumbnailUrl;

            if (!eventTitle || !imageUrl) {
                return (
                    <div className="p-4 rounded-xl bg-muted/50 text-center text-muted-foreground">
                        티켓을 찾을 수 없습니다
                    </div>
                );
            }

            return (
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div
                        className="group cursor-pointer p-4"
                        onClick={() => onImageClick(imageUrl)}
                    >
                        <div className="relative overflow-hidden rounded-xl bg-muted aspect-[3/4] max-w-sm mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={thumbnailUrl || imageUrl}
                                alt={eventTitle}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                    <p className="font-medium">{eventTitle}</p>
                                    {seat && (
                                        <p className="text-xs opacity-70 mt-0.5">{seat}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="px-4 pb-4 text-center border-t bg-muted/30">
                        <p className="font-medium text-sm pt-3">{eventTitle}</p>
                        {eventDate && (
                            <p className="text-xs text-muted-foreground">
                                {formatKoreanDate(eventDate, "YYYY년 M월 D일")}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        case "photo": {
            const photoItem = item as PhotoGalleryItem;
            return (
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div
                        className="group cursor-pointer"
                        onClick={() => onImageClick(photoItem.imageUrl)}
                    >
                        <div className="relative overflow-hidden bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photoItem.thumbnailUrl || photoItem.imageUrl}
                                alt={photoItem.caption || "사진"}
                                className="w-full h-auto transition-transform group-hover:scale-105"
                            />
                        </div>
                    </div>
                    {(photoItem.caption || photoItem.eventTitle) && (
                        <div className="p-4 text-center border-t bg-muted/30">
                            {photoItem.caption && (
                                <p className="text-sm">{photoItem.caption}</p>
                            )}
                            {photoItem.eventTitle && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {photoItem.eventTitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        case "instagram": {
            const igItem = item as InstagramGalleryItem;
            return (
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden max-w-lg mx-auto">
                    <div className="flex items-center gap-2 p-4 border-b">
                        <Instagram
                            className="h-5 w-5"
                            style={{ color: getPlatformColor("instagram") }}
                        />
                        <span className="text-sm font-medium">Instagram</span>
                        <a
                            href={igItem.embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                    <div className="p-4">
                        {igItem.embedHtml ? (
                            <div
                                className="instagram-embed flex justify-center"
                                dangerouslySetInnerHTML={{ __html: igItem.embedHtml }}
                            />
                        ) : (
                            <a
                                href={igItem.embedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 rounded-lg bg-muted text-center hover:bg-muted/80 transition-colors"
                            >
                                <Instagram className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Instagram에서 보기</p>
                            </a>
                        )}
                    </div>
                </div>
            );
        }

        case "twitter": {
            const twItem = item as TwitterGalleryItem;
            return (
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden max-w-lg mx-auto">
                    <div className="flex items-center gap-2 p-4 border-b">
                        <span
                            className="text-lg font-bold"
                            style={{ color: getPlatformColor("twitter") }}
                        >
                            𝕏
                        </span>
                        <span className="text-sm font-medium">
                            {twItem.authorHandle ? `@${twItem.authorHandle}` : "Twitter"}
                        </span>
                        <a
                            href={twItem.embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                    <div className="p-4">
                        {twItem.embedHtml ? (
                            <div
                                className="twitter-embed flex justify-center"
                                dangerouslySetInnerHTML={{ __html: twItem.embedHtml }}
                            />
                        ) : (
                            <a
                                href={twItem.embedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 rounded-lg bg-muted text-center hover:bg-muted/80 transition-colors"
                            >
                                <span className="text-3xl block mb-2">𝕏</span>
                                <p className="text-sm">Twitter에서 보기</p>
                            </a>
                        )}
                    </div>
                    {twItem.content && (
                        <div className="px-4 pb-4">
                            <p className="text-sm text-center text-muted-foreground">{twItem.content}</p>
                        </div>
                    )}
                </div>
            );
        }

        default:
            return null;
    }
}

/** Mock 갤러리 생성 (개발용) */
function createMockGallery(shareId: string): Gallery {
    return {
        id: `mock-gallery-${shareId}`,
        userId: "mock-user",
        title: "테스트 공연 갤러리",
        description: "개발용 Mock 갤러리입니다. 실제 데이터는 Supabase에서 로드됩니다.",
        items: [
            {
                id: "mock-item-1",
                type: "ticket" as const,
                ticketId: "ticket_1",
                ticketSnapshot: {
                    eventTitle: "2024 연말 콘서트",
                    eventDate: new Date("2024-12-25"),
                    frontImageUrl: "https://picsum.photos/seed/ticket1/400/600",
                },
                createdAt: new Date("2024-12-25"),
                order: 0,
            },
            {
                id: "mock-item-2",
                type: "photo" as const,
                imageUrl: "https://picsum.photos/seed/photo1/800/600",
                caption: "멋진 공연 사진",
                createdAt: new Date("2024-11-15"),
                order: 1,
            },
            {
                id: "mock-item-3",
                type: "ticket" as const,
                ticketId: "ticket_2",
                ticketSnapshot: {
                    eventTitle: "가을 페스티벌",
                    eventDate: new Date("2024-10-20"),
                    frontImageUrl: "https://picsum.photos/seed/ticket2/400/600",
                },
                createdAt: new Date("2024-10-20"),
                order: 2,
            },
            {
                id: "mock-item-4",
                type: "instagram" as const,
                embedUrl: "https://www.instagram.com/p/example123/",
                createdAt: new Date("2024-10-21"),
                order: 3,
            },
            {
                id: "mock-item-5",
                type: "ticket" as const,
                ticketId: "ticket_3",
                ticketSnapshot: {
                    eventTitle: "여름 록 페스티벌",
                    eventDate: new Date("2024-07-15"),
                    frontImageUrl: "https://picsum.photos/seed/ticket3/400/600",
                },
                createdAt: new Date("2024-07-15"),
                order: 4,
            },
            {
                id: "mock-item-6",
                type: "photo" as const,
                imageUrl: "https://picsum.photos/seed/photo2/800/600",
                caption: "무대 전경",
                createdAt: new Date("2023-12-31"),
                order: 5,
            },
        ],
        isPublic: true,
        shareId,
        viewCount: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
