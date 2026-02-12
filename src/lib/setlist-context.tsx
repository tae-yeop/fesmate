"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { MOCK_USERS } from "@/lib/mock-data";
import { isValidUUID } from "@/lib/utils";
import { createSharedAdapter, DOMAINS } from "./storage";
import {
    Setlist,
    SetlistSong,
    CreateSetlistInput,
    UpdateSetlistInput,
} from "@/types/setlist";

// ===== Mock 데이터 =====

export const MOCK_SETLISTS: Setlist[] = [
    {
        id: "setlist-1",
        slotId: "slot-1",
        eventId: "55948",
        artistId: "a1",
        artistName: "Atarashii Gakko!",
        songs: [
            { id: "song-1-1", order: 1, title: "OTONABLUE", isEncore: false },
            { id: "song-1-2", order: 2, title: "TOKYO CALLING", isEncore: false },
            { id: "song-1-3", order: 3, title: "Pineapple Kryptonite", isEncore: false, note: "with special dance" },
            { id: "song-1-4", order: 4, title: "NAINAINAI", isEncore: false },
            { id: "song-1-5", order: 5, title: "Giri Giri", isEncore: false },
            { id: "song-1-6", order: 6, title: "FREAKS", isEncore: true },
            { id: "song-1-7", order: 7, title: "Que Sera Sera", isEncore: true },
        ],
        createdBy: "user1",
        createdByNickname: "덕후A",
        createdAt: new Date("2025-01-05T10:00:00"),
        updatedAt: new Date("2025-01-05T10:00:00"),
        status: "published",
        helpfulCount: 42,
    },
    {
        id: "setlist-2",
        slotId: "slot-g-1",
        eventId: "e7",
        artistId: "a-penta-1",
        artistName: "QWER",
        songs: [
            { id: "song-2-1", order: 1, title: "T.B.H", isEncore: false },
            { id: "song-2-2", order: 2, title: "Fake Queen", isEncore: false },
            { id: "song-2-3", order: 3, title: "Discord", isEncore: false, note: "신곡" },
            { id: "song-2-4", order: 4, title: "Manito", isEncore: false },
            { id: "song-2-5", order: 5, title: "My Name Is Maru", isEncore: true },
        ],
        createdBy: "user2",
        createdByNickname: "뮤직러버",
        createdAt: new Date("2025-01-06T14:30:00"),
        updatedAt: new Date("2025-01-06T14:30:00"),
        status: "published",
        helpfulCount: 18,
    },
    {
        id: "setlist-3",
        slotId: "slot-g-2",
        eventId: "e7",
        artistId: "a-penta-2",
        artistName: "잔나비",
        songs: [
            { id: "song-3-1", order: 1, title: "주황색 꿈", isEncore: false },
            { id: "song-3-2", order: 2, title: "뜨거운 여름밤은 가고 남은 건 볼품없지만", isEncore: false },
            { id: "song-3-3", order: 3, title: "She", isEncore: false },
            { id: "song-3-4", order: 4, title: "소란한 거리에서 우리가 만났을 때", isEncore: false },
        ],
        createdBy: "user1",
        createdByNickname: "덕후A",
        createdAt: new Date("2025-01-04T09:00:00"),
        updatedAt: new Date("2025-01-04T09:00:00"),
        status: "draft",
        helpfulCount: 0,
    },
];

// ===== Context 타입 =====

interface SetlistContextValue {
    setlists: Setlist[];
    createSetlist: (input: CreateSetlistInput) => Promise<Setlist | null>;
    updateSetlist: (setlistId: string, input: UpdateSetlistInput) => Promise<boolean>;
    deleteSetlist: (setlistId: string) => Promise<boolean>;
    getSetlistBySlot: (slotId: string) => Setlist | undefined;
    getSetlistsByEvent: (eventId: string) => Setlist[];
    toggleHelpful: (setlistId: string) => Promise<boolean>;
    helpfulSetlistIds: string[];
    currentUserId: string;
    isLoading: boolean;
    isFromSupabase: boolean;
}

const SetlistContext = createContext<SetlistContextValue | null>(null);

// Storage adapters
const setlistsAdapter = createSharedAdapter<Setlist[]>({
    domain: DOMAINS.SETLISTS,
    dateFields: ["createdAt", "updatedAt"],
});

const helpfulAdapter = createSharedAdapter<Record<string, string[]>>({
    domain: DOMAINS.SETLIST_HELPFUL,
});

const getUserNickname = (userId: string): string => {
    const user = MOCK_USERS.find(u => u.id === userId);
    return user?.nickname || "익명";
};

const generateSongId = (): string => {
    return `song-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export function SetlistProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();

    const realUserId = authUser?.id;
    const isRealUser = !!realUserId && isValidUUID(realUserId);
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;
    const currentUserId = realUserId || devUserId || "";

    const [setlists, setSetlists] = useState<Setlist[]>(MOCK_SETLISTS);
    const [helpfulByUser, setHelpfulByUser] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isLoaded) return;

        if (isRealUser) {
            setIsFromSupabase(false);
            setIsLoaded(true);
            return;
        }

        try {
            const storedSetlists = setlistsAdapter.get();
            if (storedSetlists && storedSetlists.length > 0) {
                setSetlists(storedSetlists);
            }

            const storedHelpful = helpfulAdapter.get();
            if (storedHelpful) {
                setHelpfulByUser(storedHelpful);
            }
        } catch (error) {
            console.error("[SetlistContext] Failed to load from localStorage:", error);
        }

        setIsLoaded(true);
    }, [isRealUser, isLoaded]);

    useEffect(() => {
        if (!isLoaded || isFromSupabase) return;

        try {
            setlistsAdapter.set(setlists);
        } catch (error) {
            console.error("[SetlistContext] Failed to save setlists:", error);
        }
    }, [setlists, isLoaded, isFromSupabase]);

    useEffect(() => {
        if (!isLoaded || isFromSupabase) return;

        try {
            helpfulAdapter.set(helpfulByUser);
        } catch (error) {
            console.error("[SetlistContext] Failed to save helpful:", error);
        }
    }, [helpfulByUser, isLoaded, isFromSupabase]);

    const helpfulSetlistIds = currentUserId ? (helpfulByUser[currentUserId] || []) : [];

    const getSetlistBySlot = useCallback((slotId: string): Setlist | undefined => {
        return setlists.find(s => s.slotId === slotId && s.status === "published");
    }, [setlists]);

    const getSetlistsByEvent = useCallback((eventId: string): Setlist[] => {
        return setlists
            .filter(s => s.eventId === eventId && s.status === "published")
            .sort((a, b) => b.helpfulCount - a.helpfulCount);
    }, [setlists]);

    const createSetlist = useCallback(async (input: CreateSetlistInput): Promise<Setlist | null> => {
        if (!currentUserId) return null;

        setIsLoading(true);

        try {
            const songsWithIds: SetlistSong[] = input.songs.map((song, index) => ({
                ...song,
                id: generateSongId(),
                order: index + 1,
            }));

            const newSetlist: Setlist = {
                id: `setlist-${Date.now()}`,
                slotId: input.slotId,
                eventId: input.eventId,
                artistId: input.artistId,
                artistName: input.artistName,
                songs: songsWithIds,
                createdBy: currentUserId,
                createdByNickname: getUserNickname(currentUserId),
                createdAt: new Date(),
                updatedAt: new Date(),
                status: "draft",
                helpfulCount: 0,
            };

            setSetlists(prev => [...prev, newSetlist]);

            return newSetlist;
        } catch (error) {
            console.error("[SetlistContext] Failed to create setlist:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    const updateSetlist = useCallback(async (setlistId: string, input: UpdateSetlistInput): Promise<boolean> => {
        setIsLoading(true);

        try {
            const index = setlists.findIndex(s => s.id === setlistId);
            if (index === -1) return false;

            const existing = setlists[index];
            if (existing.createdBy !== currentUserId) return false;

            const updatedSongs: SetlistSong[] | undefined = input.songs?.map((song, idx) => ({
                ...song,
                id: generateSongId(),
                order: idx + 1,
            }));

            const updatedSetlist: Setlist = {
                ...existing,
                songs: updatedSongs || existing.songs,
                status: input.status || existing.status,
                updatedAt: new Date(),
            };

            setSetlists(prev => {
                const next = [...prev];
                next[index] = updatedSetlist;
                return next;
            });

            return true;
        } catch (error) {
            console.error("[SetlistContext] Failed to update setlist:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setlists, currentUserId]);

    const deleteSetlist = useCallback(async (setlistId: string): Promise<boolean> => {
        setIsLoading(true);

        try {
            const existing = setlists.find(s => s.id === setlistId);
            if (!existing) return false;

            if (existing.createdBy !== currentUserId) return false;

            setSetlists(prev => prev.filter(s => s.id !== setlistId));

            return true;
        } catch (error) {
            console.error("[SetlistContext] Failed to delete setlist:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [setlists, currentUserId]);

    const toggleHelpful = useCallback(async (setlistId: string): Promise<boolean> => {
        if (!currentUserId) return false;

        try {
            const userHelpful = helpfulByUser[currentUserId] || [];
            const isCurrentlyHelpful = userHelpful.includes(setlistId);

            if (isCurrentlyHelpful) {
                setHelpfulByUser(prev => ({
                    ...prev,
                    [currentUserId]: prev[currentUserId].filter(id => id !== setlistId),
                }));

                setSetlists(prev => prev.map(s =>
                    s.id === setlistId ? { ...s, helpfulCount: Math.max(0, s.helpfulCount - 1) } : s
                ));
            } else {
                setHelpfulByUser(prev => ({
                    ...prev,
                    [currentUserId]: [...(prev[currentUserId] || []), setlistId],
                }));

                setSetlists(prev => prev.map(s =>
                    s.id === setlistId ? { ...s, helpfulCount: s.helpfulCount + 1 } : s
                ));
            }

            return true;
        } catch (error) {
            console.error("[SetlistContext] Failed to toggle helpful:", error);
            return false;
        }
    }, [currentUserId, helpfulByUser]);

    const value: SetlistContextValue = {
        setlists,
        createSetlist,
        updateSetlist,
        deleteSetlist,
        getSetlistBySlot,
        getSetlistsByEvent,
        toggleHelpful,
        helpfulSetlistIds,
        currentUserId,
        isLoading,
        isFromSupabase,
    };

    return (
        <SetlistContext.Provider value={value}>
            {children}
        </SetlistContext.Provider>
    );
}

export function useSetlist() {
    const context = useContext(SetlistContext);
    if (!context) {
        throw new Error("useSetlist must be used within SetlistProvider");
    }
    return context;
}
