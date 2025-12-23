"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useDevContext } from "./dev-context";

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
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// 사용자별 storage key 생성
const getWishlistStorageKey = (userId: string) => `fesmate_wishlist_${userId}`;
const getAttendedStorageKey = (userId: string) => `fesmate_attended_${userId}`;

// Mock: 다른 사용자들의 찜/다녀온 행사 데이터 (실제로는 서버에서 가져와야 함)
const MOCK_USER_EVENTS: Record<string, { wishlist: string[]; attended: string[] }> = {
    user1: { wishlist: ["55948", "e2", "pentaport"], attended: ["24016943", "e2"] },
    user2: { wishlist: ["55948", "e2"], attended: ["24016943", "e2"] },
    user3: { wishlist: ["e2", "pentaport", "24016943"], attended: ["55948"] },
    user4: { wishlist: ["55948", "pentaport"], attended: ["e2", "24016943"] },
    user5: { wishlist: ["e2"], attended: [] },
    user6: { wishlist: ["pentaport"], attended: ["55948", "e2"] },
};

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn } = useDevContext();
    // 비로그인 시에는 userId가 null (찜/다녀옴 데이터 비활성화)
    const currentUserId = isLoggedIn ? (mockUserId || "user1") : null;

    const [wishlist, setWishlist] = useState<Set<string>>(new Set());
    const [attended, setAttended] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

    // 사용자 변경 또는 초기 로드 시 localStorage에서 로드
    useEffect(() => {
        // 사용자가 변경되었거나 처음 로드하는 경우
        if (loadedUserId !== currentUserId) {
            // 비로그인 시에는 빈 데이터
            if (!currentUserId) {
                setWishlist(new Set());
                setAttended(new Set());
                setLoadedUserId(currentUserId);
                setIsLoaded(true);
                return;
            }

            try {
                const wishlistKey = getWishlistStorageKey(currentUserId);
                const attendedKey = getAttendedStorageKey(currentUserId);

                const savedWishlist = localStorage.getItem(wishlistKey);
                const savedAttended = localStorage.getItem(attendedKey);

                if (savedWishlist) {
                    setWishlist(new Set(JSON.parse(savedWishlist)));
                } else {
                    // 저장된 데이터가 없으면 Mock 데이터로 초기화
                    const mockData = MOCK_USER_EVENTS[currentUserId];
                    if (mockData) {
                        setWishlist(new Set(mockData.wishlist));
                    } else {
                        setWishlist(new Set());
                    }
                }

                if (savedAttended) {
                    setAttended(new Set(JSON.parse(savedAttended)));
                } else {
                    // 저장된 데이터가 없으면 Mock 데이터로 초기화
                    const mockData = MOCK_USER_EVENTS[currentUserId];
                    if (mockData) {
                        setAttended(new Set(mockData.attended));
                    } else {
                        setAttended(new Set());
                    }
                }
            } catch (e) {
                console.error("Failed to load wishlist from localStorage:", e);
            }
            setLoadedUserId(currentUserId);
            setIsLoaded(true);
        }
    }, [currentUserId, loadedUserId]);

    // localStorage에 저장 (현재 사용자의 데이터만, 로그인 시에만)
    useEffect(() => {
        if (!isLoaded || loadedUserId !== currentUserId || !currentUserId) return;
        try {
            const wishlistKey = getWishlistStorageKey(currentUserId);
            localStorage.setItem(wishlistKey, JSON.stringify([...wishlist]));
        } catch (e) {
            console.error("Failed to save wishlist to localStorage:", e);
        }
    }, [wishlist, isLoaded, currentUserId, loadedUserId]);

    useEffect(() => {
        if (!isLoaded || loadedUserId !== currentUserId || !currentUserId) return;
        try {
            const attendedKey = getAttendedStorageKey(currentUserId);
            localStorage.setItem(attendedKey, JSON.stringify([...attended]));
        } catch (e) {
            console.error("Failed to save attended to localStorage:", e);
        }
    }, [attended, isLoaded, currentUserId, loadedUserId]);

    // 찜 토글
    const toggleWishlist = useCallback((eventId: string) => {
        setWishlist((prev) => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    }, []);

    // 다녀옴 토글
    const toggleAttended = useCallback((eventId: string) => {
        setAttended((prev) => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    }, []);

    // 상태 확인
    const isWishlistFn = useCallback((eventId: string) => wishlist.has(eventId), [wishlist]);
    const isAttendedFn = useCallback((eventId: string) => attended.has(eventId), [attended]);

    // 특정 사용자의 찜 목록 조회
    const getUserWishlist = useCallback((userId: string): Set<string> => {
        if (userId === currentUserId) {
            return wishlist;
        }
        // 다른 사용자: localStorage 또는 Mock 데이터
        try {
            const key = getWishlistStorageKey(userId);
            const saved = localStorage.getItem(key);
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load user wishlist:", e);
        }
        // localStorage에 없으면 Mock 데이터
        const mockData = MOCK_USER_EVENTS[userId];
        return new Set(mockData?.wishlist || []);
    }, [currentUserId, wishlist]);

    // 특정 사용자의 다녀온 목록 조회
    const getUserAttended = useCallback((userId: string): Set<string> => {
        if (userId === currentUserId) {
            return attended;
        }
        // 다른 사용자: localStorage 또는 Mock 데이터
        try {
            const key = getAttendedStorageKey(userId);
            const saved = localStorage.getItem(key);
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load user attended:", e);
        }
        // localStorage에 없으면 Mock 데이터
        const mockData = MOCK_USER_EVENTS[userId];
        return new Set(mockData?.attended || []);
    }, [currentUserId, attended]);

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                attended,
                toggleWishlist,
                toggleAttended,
                isWishlist: isWishlistFn,
                isAttended: isAttendedFn,
                getUserWishlist,
                getUserAttended,
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
