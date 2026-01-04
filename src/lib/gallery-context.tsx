"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import type {
    Gallery,
    GalleryItem,
    CreateGalleryInput,
    AddGalleryItemInput,
    TicketGalleryItem,
} from "@/types/gallery";
import type { Ticket } from "@/types/ticketbook";
import { createSharedAdapter, DOMAINS } from "@/lib/storage";
import { parseSocialUrl, generateInstagramEmbedHtml, generateTwitterEmbedHtml } from "@/lib/utils/oembed";

/** 갤러리 Storage Adapter */
const galleriesAdapter = createSharedAdapter<Gallery[]>({
    domain: DOMAINS.GALLERIES,
    dateFields: ["createdAt", "updatedAt"],
    nestedDateFields: ["items.createdAt", "items.takenAt", "items.ticketSnapshot.eventDate"],
});

/** 갤러리 Context 상태 */
interface GalleryContextState {
    /** 현재 사용자의 갤러리 목록 */
    galleries: Gallery[];
    /** 선택된 갤러리 ID */
    selectedGalleryId: string | null;
    /** 로딩 상태 */
    isLoading: boolean;
}

/** 갤러리 Context 액션 */
interface GalleryContextActions {
    /** 갤러리 생성 */
    createGallery: (input: CreateGalleryInput) => Gallery;
    /** 갤러리 수정 */
    updateGallery: (galleryId: string, updates: Partial<CreateGalleryInput>) => void;
    /** 갤러리 삭제 */
    deleteGallery: (galleryId: string) => void;
    /** 갤러리 선택 */
    selectGallery: (galleryId: string | null) => void;
    /** 갤러리 아이템 추가 */
    addItem: (galleryId: string, input: AddGalleryItemInput) => void;
    /** 갤러리 아이템 삭제 */
    removeItem: (galleryId: string, itemId: string) => void;
    /** 아이템 순서 변경 */
    reorderItems: (galleryId: string, itemIds: string[]) => void;
    /** 공개/비공개 토글 */
    togglePublic: (galleryId: string) => void;
    /** 공유 URL 생성 */
    generateShareUrl: (galleryId: string) => string | null;
    /** 갤러리 ID로 조회 */
    getGalleryById: (galleryId: string) => Gallery | null;
    /** 공유 ID로 조회 */
    getGalleryByShareId: (shareId: string) => Gallery | null;
    /** 티켓들로 갤러리 생성 (스냅샷 포함) */
    createFromTickets: (tickets: Ticket[], title?: string, isPublic?: boolean) => Gallery;
}

type GalleryContextValue = GalleryContextState & GalleryContextActions;

const GalleryContext = createContext<GalleryContextValue | null>(null);

/** 고유 ID 생성 */
function generateId(): string {
    return `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 공유 ID 생성 (짧은 형식) */
function generateShareId(): string {
    return Math.random().toString(36).substring(2, 10);
}

/** 갤러리 Provider Props */
interface GalleryProviderProps {
    children: ReactNode;
    userId?: string;
}

/**
 * 갤러리 Context Provider
 * - 갤러리 CRUD
 * - 아이템 추가/삭제/순서변경
 * - 공유 URL 생성
 * - localStorage 영속화
 */
export function GalleryProvider({ children, userId = "current-user" }: GalleryProviderProps) {
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // localStorage에서 로드
    useEffect(() => {
        const stored = galleriesAdapter.get();
        if (stored) {
            setGalleries(stored);
        }
        setIsLoading(false);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoading) {
            galleriesAdapter.set(galleries);
        }
    }, [galleries, isLoading]);

    /** 갤러리 생성 */
    const createGallery = useCallback(
        (input: CreateGalleryInput): Gallery => {
            const now = new Date();
            const newGallery: Gallery = {
                id: generateId(),
                userId,
                title: input.title,
                description: input.description,
                items: [],
                isPublic: input.isPublic ?? false,
                viewCount: 0,
                createdAt: now,
                updatedAt: now,
            };

            setGalleries((prev) => [...prev, newGallery]);
            return newGallery;
        },
        [userId]
    );

    /** 갤러리 수정 */
    const updateGallery = useCallback(
        (galleryId: string, updates: Partial<CreateGalleryInput>) => {
            setGalleries((prev) =>
                prev.map((g) =>
                    g.id === galleryId
                        ? {
                              ...g,
                              ...updates,
                              updatedAt: new Date(),
                          }
                        : g
                )
            );
        },
        []
    );

    /** 갤러리 삭제 */
    const deleteGallery = useCallback((galleryId: string) => {
        setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
        setSelectedGalleryId((prev) => (prev === galleryId ? null : prev));
    }, []);

    /** 갤러리 선택 */
    const selectGallery = useCallback((galleryId: string | null) => {
        setSelectedGalleryId(galleryId);
    }, []);

    /** 아이템 추가 */
    const addItem = useCallback((galleryId: string, input: AddGalleryItemInput) => {
        setGalleries((prev) =>
            prev.map((g) => {
                if (g.id !== galleryId) return g;

                const maxOrder = g.items.length > 0
                    ? Math.max(...g.items.map((i) => i.order))
                    : -1;

                let newItem: GalleryItem;
                const baseItem = {
                    id: generateId(),
                    createdAt: new Date(),
                    order: maxOrder + 1,
                };

                switch (input.type) {
                    case "ticket":
                        if (!input.ticketId) return g;
                        newItem = {
                            ...baseItem,
                            type: "ticket" as const,
                            ticketId: input.ticketId,
                        };
                        break;

                    case "photo":
                        if (!input.imageUrl) return g;
                        newItem = {
                            ...baseItem,
                            type: "photo" as const,
                            imageUrl: input.imageUrl,
                            caption: input.caption,
                            eventId: input.eventId,
                            takenAt: input.takenAt,
                        };
                        break;

                    case "instagram":
                        if (!input.embedUrl) return g;
                        const igParsed = parseSocialUrl(input.embedUrl);
                        if (!igParsed || igParsed.platform !== "instagram") return g;
                        newItem = {
                            ...baseItem,
                            type: "instagram" as const,
                            embedUrl: input.embedUrl,
                            embedHtml: generateInstagramEmbedHtml(input.embedUrl),
                        };
                        break;

                    case "twitter":
                        if (!input.embedUrl) return g;
                        const twParsed = parseSocialUrl(input.embedUrl);
                        if (!twParsed || twParsed.platform !== "twitter") return g;
                        newItem = {
                            ...baseItem,
                            type: "twitter" as const,
                            embedUrl: input.embedUrl,
                            embedHtml: generateTwitterEmbedHtml(input.embedUrl),
                            authorHandle: twParsed.username,
                        };
                        break;

                    default:
                        return g;
                }

                return {
                    ...g,
                    items: [...g.items, newItem],
                    updatedAt: new Date(),
                };
            })
        );
    }, []);

    /** 아이템 삭제 */
    const removeItem = useCallback((galleryId: string, itemId: string) => {
        setGalleries((prev) =>
            prev.map((g) => {
                if (g.id !== galleryId) return g;
                return {
                    ...g,
                    items: g.items.filter((i) => i.id !== itemId),
                    updatedAt: new Date(),
                };
            })
        );
    }, []);

    /** 아이템 순서 변경 */
    const reorderItems = useCallback((galleryId: string, itemIds: string[]) => {
        setGalleries((prev) =>
            prev.map((g) => {
                if (g.id !== galleryId) return g;

                const reorderedItems = itemIds
                    .map((id, index) => {
                        const item = g.items.find((i) => i.id === id);
                        return item ? { ...item, order: index } : null;
                    })
                    .filter((item): item is GalleryItem => item !== null);

                return {
                    ...g,
                    items: reorderedItems,
                    updatedAt: new Date(),
                };
            })
        );
    }, []);

    /** 공개/비공개 토글 */
    const togglePublic = useCallback((galleryId: string) => {
        setGalleries((prev) =>
            prev.map((g) => {
                if (g.id !== galleryId) return g;

                const isPublic = !g.isPublic;
                return {
                    ...g,
                    isPublic,
                    shareId: isPublic && !g.shareId ? generateShareId() : g.shareId,
                    updatedAt: new Date(),
                };
            })
        );
    }, []);

    /** 공유 URL 생성 */
    const generateShareUrl = useCallback(
        (galleryId: string): string | null => {
            const gallery = galleries.find((g) => g.id === galleryId);
            if (!gallery) return null;

            // 공개가 아니면 먼저 공개로 전환
            if (!gallery.isPublic) {
                togglePublic(galleryId);
            }

            // shareId가 없으면 생성
            let shareId = gallery.shareId;
            if (!shareId) {
                shareId = generateShareId();
                setGalleries((prev) =>
                    prev.map((g) =>
                        g.id === galleryId
                            ? { ...g, shareId, updatedAt: new Date() }
                            : g
                    )
                );
            }

            return `/share/gallery/${shareId}`;
        },
        [galleries, togglePublic]
    );

    /** 갤러리 ID로 조회 */
    const getGalleryById = useCallback(
        (galleryId: string): Gallery | null => {
            return galleries.find((g) => g.id === galleryId) || null;
        },
        [galleries]
    );

    /** 공유 ID로 조회 */
    const getGalleryByShareId = useCallback(
        (shareId: string): Gallery | null => {
            return galleries.find((g) => g.shareId === shareId && g.isPublic) || null;
        },
        [galleries]
    );

    /** 티켓들로 갤러리 생성 (스냅샷 포함) */
    const createFromTickets = useCallback(
        (tickets: Ticket[], title?: string, isPublic?: boolean): Gallery => {
            const now = new Date();
            const shareId = isPublic ? generateShareId() : undefined;

            // 티켓 정보를 스냅샷으로 저장 (공유 시 필요)
            const ticketItems: TicketGalleryItem[] = tickets.map((ticket, index) => ({
                id: generateId(),
                type: "ticket" as const,
                ticketId: ticket.id,
                ticketSnapshot: {
                    eventTitle: ticket.eventTitle,
                    eventDate: ticket.eventDate,
                    seat: ticket.seat,
                    frontImageUrl: ticket.frontImage.url,
                    frontImageThumbnailUrl: ticket.frontImage.thumbnailUrl,
                },
                createdAt: now,
                order: index,
            }));

            const newGallery: Gallery = {
                id: generateId(),
                userId,
                title: title || "내 티켓 갤러리",
                items: ticketItems,
                isPublic: isPublic ?? false,
                shareId,
                viewCount: 0,
                createdAt: now,
                updatedAt: now,
            };

            setGalleries((prev) => [...prev, newGallery]);
            return newGallery;
        },
        [userId]
    );

    const value: GalleryContextValue = {
        // State
        galleries,
        selectedGalleryId,
        isLoading,
        // Actions
        createGallery,
        updateGallery,
        deleteGallery,
        selectGallery,
        addItem,
        removeItem,
        reorderItems,
        togglePublic,
        generateShareUrl,
        getGalleryById,
        getGalleryByShareId,
        createFromTickets,
    };

    return (
        <GalleryContext.Provider value={value}>
            {children}
        </GalleryContext.Provider>
    );
}

/**
 * 갤러리 Context Hook
 */
export function useGallery(): GalleryContextValue {
    const context = useContext(GalleryContext);
    if (!context) {
        throw new Error("useGallery must be used within a GalleryProvider");
    }
    return context;
}

/**
 * 선택된 갤러리 Hook
 */
export function useSelectedGallery(): Gallery | null {
    const { galleries, selectedGalleryId } = useGallery();
    return galleries.find((g) => g.id === selectedGalleryId) || null;
}
