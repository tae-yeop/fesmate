"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

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
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "fesmate_wishlist";
const ATTENDED_STORAGE_KEY = "fesmate_attended";

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<Set<string>>(new Set());
    const [attended, setAttended] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);

    // localStorage에서 로드
    useEffect(() => {
        try {
            const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
            const savedAttended = localStorage.getItem(ATTENDED_STORAGE_KEY);

            if (savedWishlist) {
                setWishlist(new Set(JSON.parse(savedWishlist)));
            }
            if (savedAttended) {
                setAttended(new Set(JSON.parse(savedAttended)));
            }
        } catch (e) {
            console.error("Failed to load wishlist from localStorage:", e);
        }
        setIsLoaded(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([...wishlist]));
        } catch (e) {
            console.error("Failed to save wishlist to localStorage:", e);
        }
    }, [wishlist, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(ATTENDED_STORAGE_KEY, JSON.stringify([...attended]));
        } catch (e) {
            console.error("Failed to save attended to localStorage:", e);
        }
    }, [attended, isLoaded]);

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

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                attended,
                toggleWishlist,
                toggleAttended,
                isWishlist: isWishlistFn,
                isAttended: isAttendedFn,
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
