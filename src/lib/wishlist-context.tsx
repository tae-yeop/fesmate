"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import { createUserAdapter, DOMAINS } from "./storage";
import { isValidUUID } from "./utils";
import {
    getWishlistEventIds,
    getAttendedEventIds,
    toggleUserWishlist,
    toggleUserAttended,
} from "./supabase/queries";

interface WishlistContextType {
    // 찜 목록
    wishlist: Set<string>;
    // 다녀옴 목록
    attended: Set<string>;
    // 찜 토글
    toggleWishlist: (eventId: string) => void;
    // 다녀옴 토글
    toggleAttended: (eventId: string) => void;
    // 상태 확인
    isWishlist: (eventId: string) => boolean;
    isAttended: (eventId: string) => boolean;
    // 특정 사용자의 찜/다녀온 목록 조회
    getUserWishlist: (userId: string) => Set<string>;
    getUserAttended: (userId: string) => Set<string>;
    // 데이터 소스 표시
    isFromSupabase: boolean;
    isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Storage adapter factory (userId 기반) - localStorage 폴백용
const createWishlistAdapter = createUserAdapter<string[]>({
    domain: DOMAINS.WISHLIST,
});
const createAttendedAdapter = createUserAdapter<string[]>({
    domain: DOMAINS.ATTENDED,
});

// Mock: 다른 사용자들의 찜/다녀온 행사 데이터 (Dev 모드용)
const MOCK_USER_EVENTS: Record<string, { wishlist: string[]; attended: string[] }> = {
    user1: { wishlist: ["55948", "e2", "pentaport"], attended: ["24016943", "e2"] },
    user2: { wishlist: ["55948", "e2"], attended: ["24016943", "e2"] },
    user3: { wishlist: ["e2", "pentaport", "24016943"], attended: ["55948"] },
    user4: { wishlist: ["55948", "pentaport"], attended: ["e2", "24016943"] },
    user5: { wishlist: ["e2"], attended: [] },
    user6: { wishlist: ["pentaport"], attended: ["55948", "e2"] },
};

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    const currentUserId = realUserId || devUserId;

    const [wishlist, setWishlist] = useState<Set<string>>(new Set());
    const [attended, setAttended] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

    // Storage adapters (Dev 모드용, userId 변경 시 재생성)
    const wishlistAdapter = useMemo(
        () => (devUserId && !isRealUser) ? createWishlistAdapter(devUserId) : null,
        [devUserId, isRealUser]
    );
    const attendedAdapter = useMemo(
        () => (devUserId && !isRealUser) ? createAttendedAdapter(devUserId) : null,
        [devUserId, isRealUser]
    );

    // 사용자 변경 또는 초기 로드 시 데이터 로드
    useEffect(() => {
        // 사용자가 변경되었거나 처음 로드하는 경우
        if (loadedUserId !== currentUserId) {
            // 비로그인 시에는 빈 데이터
            if (!currentUserId) {
                setWishlist(new Set());
                setAttended(new Set());
                setLoadedUserId(currentUserId);
                setIsFromSupabase(false);
                return;
            }

            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                setIsLoading(true);
                Promise.all([
                    getWishlistEventIds(realUserId),
                    getAttendedEventIds(realUserId),
                ])
                    .then(([wishlistIds, attendedIds]) => {
                        setWishlist(new Set(wishlistIds));
                        setAttended(new Set(attendedIds));
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[WishlistContext] Supabase load failed:", error);
                        // Supabase 실패 시 빈 상태로 시작
                        setWishlist(new Set());
                        setAttended(new Set());
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            if (wishlistAdapter && attendedAdapter) {
                const savedWishlist = wishlistAdapter.get();
                if (savedWishlist) {
                    setWishlist(new Set(savedWishlist));
                } else {
                    const mockData = MOCK_USER_EVENTS[currentUserId];
                    setWishlist(new Set(mockData?.wishlist || []));
                }

                const savedAttended = attendedAdapter.get();
                if (savedAttended) {
                    setAttended(new Set(savedAttended));
                } else {
                    const mockData = MOCK_USER_EVENTS[currentUserId];
                    setAttended(new Set(mockData?.attended || []));
                }
            }

            setLoadedUserId(currentUserId);
            setIsFromSupabase(false);
        }
    }, [currentUserId, loadedUserId, isRealUser, realUserId, wishlistAdapter, attendedAdapter]);

    // localStorage에 저장 (Dev 모드만)
    useEffect(() => {
        if (isRealUser || !wishlistAdapter || loadedUserId !== currentUserId) return;
        wishlistAdapter.set([...wishlist]);
    }, [wishlist, isRealUser, currentUserId, loadedUserId, wishlistAdapter]);

    useEffect(() => {
        if (isRealUser || !attendedAdapter || loadedUserId !== currentUserId) return;
        attendedAdapter.set([...attended]);
    }, [attended, isRealUser, currentUserId, loadedUserId, attendedAdapter]);

    // 찜 토글
    const toggleWishlistFn = useCallback((eventId: string) => {
        if (!currentUserId) return;

        const wasWishlisted = wishlist.has(eventId);

        // Optimistic update
        setWishlist((prev) => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });

        // 실제 사용자 + 유효한 UUID 이벤트: Supabase에 저장
        // Mock 이벤트 ID(e1, e2 등)는 Supabase에 없으므로 건너뜀
        if (isRealUser && realUserId && isValidUUID(eventId)) {
            toggleUserWishlist(realUserId, eventId).catch((error) => {
                console.error("[WishlistContext] toggleWishlist failed:", error.message || error);
                // 롤백
                setWishlist((prev) => {
                    const next = new Set(prev);
                    if (wasWishlisted) {
                        next.add(eventId);
                    } else {
                        next.delete(eventId);
                    }
                    return next;
                });
            });
        }
        // Dev 모드 또는 Mock 이벤트: localStorage는 useEffect에서 자동 저장
    }, [currentUserId, isRealUser, realUserId, wishlist]);

    // 다녀옴 토글
    const toggleAttendedFn = useCallback((eventId: string) => {
        if (!currentUserId) return;

        const wasAttended = attended.has(eventId);

        // Optimistic update
        setAttended((prev) => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });

        // 실제 사용자 + 유효한 UUID 이벤트: Supabase에 저장
        // Mock 이벤트 ID(e1, e2 등)는 Supabase에 없으므로 건너뜀
        if (isRealUser && realUserId && isValidUUID(eventId)) {
            toggleUserAttended(realUserId, eventId).catch((error) => {
                console.error("[WishlistContext] toggleAttended failed:", error.message || error);
                // 롤백
                setAttended((prev) => {
                    const next = new Set(prev);
                    if (wasAttended) {
                        next.add(eventId);
                    } else {
                        next.delete(eventId);
                    }
                    return next;
                });
            });
        }
        // Dev 모드 또는 Mock 이벤트: localStorage는 useEffect에서 자동 저장
    }, [currentUserId, isRealUser, realUserId, attended]);

    // 상태 확인
    const isWishlistFn = useCallback((eventId: string) => wishlist.has(eventId), [wishlist]);
    const isAttendedFn = useCallback((eventId: string) => attended.has(eventId), [attended]);

    // 특정 사용자의 찜 목록 조회
    const getUserWishlist = useCallback((userId: string): Set<string> => {
        if (userId === currentUserId) {
            return wishlist;
        }
        // 다른 사용자: localStorage 또는 Mock 데이터 (Dev 모드용)
        const adapter = createWishlistAdapter(userId);
        const saved = adapter.get();
        if (saved) {
            return new Set(saved);
        }
        const mockData = MOCK_USER_EVENTS[userId];
        return new Set(mockData?.wishlist || []);
    }, [currentUserId, wishlist]);

    // 특정 사용자의 다녀온 목록 조회
    const getUserAttended = useCallback((userId: string): Set<string> => {
        if (userId === currentUserId) {
            return attended;
        }
        // 다른 사용자: localStorage 또는 Mock 데이터 (Dev 모드용)
        const adapter = createAttendedAdapter(userId);
        const saved = adapter.get();
        if (saved) {
            return new Set(saved);
        }
        const mockData = MOCK_USER_EVENTS[userId];
        return new Set(mockData?.attended || []);
    }, [currentUserId, attended]);

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                attended,
                toggleWishlist: toggleWishlistFn,
                toggleAttended: toggleAttendedFn,
                isWishlist: isWishlistFn,
                isAttended: isAttendedFn,
                getUserWishlist,
                getUserAttended,
                isFromSupabase,
                isLoading,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error("useWishlist must be used within a WishlistProvider");
    }
    return context;
}
