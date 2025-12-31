"use client";

/**
 * CallGuideContext
 *
 * 콜가이드 관리를 위한 Context
 * - 실제 로그인 사용자: Supabase DB 사용
 * - Dev 모드/비로그인: localStorage 사용
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from "react";
import {
    Song,
    CallGuide,
    CallGuideEntry,
    CallGuideVersion,
    CreateCallGuideInput,
    CreateCallGuideEntryInput,
    CreateSongInput,
} from "@/types/call-guide";
import { createSharedAdapter, DOMAINS } from "./storage";
import { useAuth } from "./auth-context";
import { useDevContext } from "./dev-context";
import { isValidUUID } from "./utils";

import {
    getSongs as getSongsFromDb,
    getSong as getSongFromDb,
    createSong as createSongInDb,
    getCallGuides as getCallGuidesFromDb,
    getCallGuideBySongId as getCallGuideBySongIdFromDb,
    createCallGuide as createCallGuideInDb,
    addCallGuideEntry as addCallGuideEntryInDb,
    updateCallGuideEntry as updateCallGuideEntryInDb,
    deleteCallGuideEntry as deleteCallGuideEntryInDb,
    replaceCallGuideEntries as replaceCallGuideEntriesInDb,
    saveCallGuideVersion as saveCallGuideVersionInDb,
    getCallGuideVersions as getCallGuideVersionsFromDb,
    toggleCallGuideReaction as toggleCallGuideReactionInDb,
    getUserCallGuideReactions as getUserCallGuideReactionsFromDb,
    toggleEntryReaction as toggleEntryReactionInDb,
    getUserEntryReactions as getUserEntryReactionsFromDb,
} from "./supabase/queries";

interface CallGuideContextType {
    // 곡 관련
    songs: Song[];
    getSong: (songId: string) => Song | undefined;
    getSongsByArtist: (artistId: string) => Song[];
    addSong: (input: CreateSongInput) => Promise<Song | null>;

    // 콜가이드 관련
    callGuides: CallGuide[];
    getCallGuide: (songId: string) => CallGuide | undefined;
    createCallGuide: (input: CreateCallGuideInput, userId: string) => Promise<CallGuide | null>;
    updateCallGuide: (
        songId: string,
        entries: CallGuideEntry[],
        userId: string,
        changeDescription?: string
    ) => Promise<CallGuide | null>;

    // 콜가이드 엔트리 관련
    addEntry: (songId: string, entry: CreateCallGuideEntryInput, userId: string) => Promise<CallGuideEntry | null>;
    updateEntry: (songId: string, entryId: string, entry: Partial<CallGuideEntryInput>, userId: string) => Promise<boolean>;
    deleteEntry: (songId: string, entryId: string, userId: string) => Promise<boolean>;

    // 버전 히스토리
    versions: CallGuideVersion[];
    getVersionHistory: (callGuideId: string) => CallGuideVersion[];

    // 도움됨 (콜가이드 전체)
    toggleHelpful: (callGuideId: string) => Promise<void>;
    isHelpful: (callGuideId: string) => boolean;
    getHelpfulCount: (callGuideId: string, originalCount: number) => number;

    // 도움됨 (개별 엔트리)
    toggleEntryHelpful: (callGuideId: string, entryId: string) => Promise<void>;
    isEntryHelpful: (entryId: string) => boolean;
    getEntryHelpfulCount: (entryId: string, originalCount: number) => number;

    // 로딩 상태
    isLoaded: boolean;
    isFromSupabase: boolean;

    // 새로고침
    refreshCallGuides: () => Promise<void>;
}

type CallGuideEntryInput = Omit<CallGuideEntry, "id">;

const CallGuideContext = createContext<CallGuideContextType | undefined>(undefined);

// Storage adapters (전역 공유 데이터 - Dev 모드용)
const songsAdapter = createSharedAdapter<Song[]>({
    domain: DOMAINS.SONGS,
});
const callGuidesAdapter = createSharedAdapter<CallGuide[]>({
    domain: DOMAINS.CALL_GUIDES,
    dateFields: ["createdAt", "updatedAt"],
});
const versionsAdapter = createSharedAdapter<CallGuideVersion[]>({
    domain: DOMAINS.CALLGUIDE_VERSIONS,
    dateFields: ["editedAt"],
});

// Helpful 데이터 타입
interface CallGuideHelpfulData {
    guides: string[];
    delta: Record<string, number>;
}
const helpfulAdapter = createSharedAdapter<CallGuideHelpfulData>({
    domain: DOMAINS.CALLGUIDE_HELPFUL,
});

// UUID 생성 헬퍼
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function CallGuideProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();

    const [songs, setSongs] = useState<Song[]>([]);
    const [callGuides, setCallGuides] = useState<CallGuide[]>([]);
    const [versions, setVersions] = useState<CallGuideVersion[]>([]);
    // 콜가이드 전체 도움됨
    const [helpfulGuides, setHelpfulGuides] = useState<Set<string>>(new Set());
    const [helpfulDelta, setHelpfulDelta] = useState<Map<string, number>>(new Map());
    // 개별 엔트리 도움됨
    const [helpfulEntries, setHelpfulEntries] = useState<Set<string>>(new Set());
    const [helpfulEntryDelta, setHelpfulEntryDelta] = useState<Map<string, number>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    // 현재 사용자 ID (실제 인증 또는 Dev 모드)
    const currentUserId = user?.id || mockUserId;
    const useSupabase = currentUserId ? isValidUUID(currentUserId) : false;

    // Supabase에서 데이터 로드
    const loadFromSupabase = useCallback(async () => {
        if (!useSupabase || !currentUserId) return;

        try {
            // Songs 로드
            const dbSongs = await getSongsFromDb({ limit: 100 });
            setSongs(dbSongs);

            // CallGuides 로드
            const dbGuides = await getCallGuidesFromDb({ limit: 100 });
            setCallGuides(dbGuides);

            // 사용자 반응 로드 (콜가이드 전체)
            const userReactions = await getUserCallGuideReactionsFromDb(currentUserId);
            setHelpfulGuides(new Set(userReactions));

            // 사용자 반응 로드 (개별 엔트리)
            const userEntryReactions = await getUserEntryReactionsFromDb(currentUserId);
            setHelpfulEntries(new Set(userEntryReactions));

            setIsFromSupabase(true);
        } catch (error) {
            console.error("[CallGuideContext] Failed to load from Supabase:", error);
            // 에러 시 localStorage 데이터 사용
            loadFromLocalStorage();
        }
    }, [useSupabase, currentUserId]);

    // localStorage에서 데이터 로드
    const loadFromLocalStorage = useCallback(() => {
        const storedSongs = songsAdapter.get();
        if (storedSongs) setSongs(storedSongs);

        const storedGuides = callGuidesAdapter.get();
        if (storedGuides) setCallGuides(storedGuides);

        const storedVersions = versionsAdapter.get();
        if (storedVersions) setVersions(storedVersions);

        const storedHelpful = helpfulAdapter.get();
        if (storedHelpful) {
            setHelpfulGuides(new Set(storedHelpful.guides || []));
            setHelpfulDelta(new Map(Object.entries(storedHelpful.delta || {})));
        }

        setIsFromSupabase(false);
    }, []);

    // 초기 로드
    useEffect(() => {
        if (useSupabase) {
            loadFromSupabase().finally(() => setIsLoaded(true));
        } else {
            loadFromLocalStorage();
            setIsLoaded(true);
        }
    }, [useSupabase, loadFromSupabase, loadFromLocalStorage]);

    // localStorage에 저장 (Dev 모드에서만)
    useEffect(() => {
        if (!isLoaded || useSupabase) return;

        songsAdapter.set(songs);
        callGuidesAdapter.set(callGuides);
        versionsAdapter.set(versions);
        helpfulAdapter.set({
            guides: Array.from(helpfulGuides),
            delta: Object.fromEntries(helpfulDelta),
        });
    }, [songs, callGuides, versions, helpfulGuides, helpfulDelta, isLoaded, useSupabase]);

    // 새로고침
    const refreshCallGuides = useCallback(async () => {
        if (useSupabase) {
            await loadFromSupabase();
        } else {
            loadFromLocalStorage();
        }
    }, [useSupabase, loadFromSupabase, loadFromLocalStorage]);

    // 곡 조회
    const getSong = useCallback(
        (songId: string) => {
            return songs.find((s) => s.id === songId);
        },
        [songs]
    );

    const getSongsByArtist = useCallback(
        (artistId: string) => {
            return songs.filter((s) => s.artistId === artistId);
        },
        [songs]
    );

    // 곡 추가
    const addSong = useCallback(
        async (input: CreateSongInput): Promise<Song | null> => {
            if (useSupabase) {
                try {
                    const newSong = await createSongInDb(input);
                    setSongs((prev) => [...prev, newSong]);
                    return newSong;
                } catch (error) {
                    console.error("[CallGuideContext] Failed to add song:", error);
                    return null;
                }
            } else {
                // Mock 모드
                const newSong: Song = {
                    id: generateId(),
                    ...input,
                    hasCallGuide: false,
                };
                setSongs((prev) => [...prev, newSong]);
                return newSong;
            }
        },
        [useSupabase]
    );

    // 콜가이드 조회
    const getCallGuide = useCallback(
        (songId: string) => {
            return callGuides.find((g) => g.songId === songId);
        },
        [callGuides]
    );

    // 콜가이드 생성
    const createCallGuide = useCallback(
        async (input: CreateCallGuideInput, userId: string): Promise<CallGuide | null> => {
            if (useSupabase && isValidUUID(userId)) {
                try {
                    const newGuide = await createCallGuideInDb(userId, input.songId);

                    // 엔트리가 있으면 추가
                    if (input.entries && input.entries.length > 0) {
                        await replaceCallGuideEntriesInDb(newGuide.id, input.entries);
                        newGuide.entries = input.entries.map((e, i) => ({
                            ...e,
                            id: `temp-${i}`,
                        }));
                    }

                    setCallGuides((prev) => [...prev, newGuide]);

                    // 곡의 hasCallGuide 업데이트
                    setSongs((prev) =>
                        prev.map((s) => (s.id === input.songId ? { ...s, hasCallGuide: true } : s))
                    );

                    return newGuide;
                } catch (error) {
                    console.error("[CallGuideContext] Failed to create call guide:", error);
                    return null;
                }
            } else {
                // Mock 모드
                const now = new Date();
                const newGuide: CallGuide = {
                    id: generateId(),
                    songId: input.songId,
                    entries: input.entries || [],
                    createdBy: userId,
                    createdAt: now,
                    updatedAt: now,
                    version: 1,
                    contributors: [userId],
                    status: "draft",
                    helpfulCount: 0,
                };

                setCallGuides((prev) => [...prev, newGuide]);
                setSongs((prev) =>
                    prev.map((s) => (s.id === input.songId ? { ...s, hasCallGuide: true } : s))
                );

                // 첫 버전 저장
                const firstVersion: CallGuideVersion = {
                    id: generateId(),
                    callGuideId: newGuide.id,
                    version: 1,
                    entries: newGuide.entries,
                    editedBy: userId,
                    editedAt: now,
                    changeDescription: "최초 작성",
                };
                setVersions((prev) => [...prev, firstVersion]);

                return newGuide;
            }
        },
        [useSupabase]
    );

    // 콜가이드 업데이트
    const updateCallGuide = useCallback(
        async (
            songId: string,
            entries: CallGuideEntry[],
            userId: string,
            changeDescription?: string
        ): Promise<CallGuide | null> => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return null;

            if (useSupabase && isValidUUID(guide.id) && isValidUUID(userId)) {
                try {
                    // 엔트리 교체
                    const entriesInput = entries.map((e) => ({
                        startTime: e.startTime,
                        endTime: e.endTime,
                        type: e.type,
                        text: e.text,
                        textRomanized: e.textRomanized,
                        textOriginal: e.textOriginal,
                        instruction: e.instruction,
                        intensity: e.intensity,
                    }));
                    await replaceCallGuideEntriesInDb(guide.id, entriesInput);

                    // 버전 저장
                    await saveCallGuideVersionInDb(
                        guide.id,
                        guide.version,
                        entries,
                        userId,
                        changeDescription
                    );

                    const updatedGuide: CallGuide = {
                        ...guide,
                        entries,
                        version: guide.version + 1,
                        contributors: guide.contributors.includes(userId)
                            ? guide.contributors
                            : [...guide.contributors, userId],
                        updatedAt: new Date(),
                    };

                    setCallGuides((prev) =>
                        prev.map((g) => (g.id === guide.id ? updatedGuide : g))
                    );

                    return updatedGuide;
                } catch (error) {
                    console.error("[CallGuideContext] Failed to update call guide:", error);
                    return null;
                }
            } else {
                // Mock 모드
                const newVersion = guide.version + 1;
                const contributors = guide.contributors.includes(userId)
                    ? guide.contributors
                    : [...guide.contributors, userId];

                const updatedGuide: CallGuide = {
                    ...guide,
                    entries,
                    version: newVersion,
                    contributors,
                    updatedAt: new Date(),
                };

                setCallGuides((prev) =>
                    prev.map((g) => (g.songId === songId ? updatedGuide : g))
                );

                // 버전 히스토리 추가
                const versionEntry: CallGuideVersion = {
                    id: generateId(),
                    callGuideId: guide.id,
                    version: newVersion,
                    entries,
                    editedBy: userId,
                    editedAt: new Date(),
                    changeDescription,
                };
                setVersions((prev) => [...prev, versionEntry]);

                return updatedGuide;
            }
        },
        [callGuides, useSupabase]
    );

    // 엔트리 추가
    const addEntry = useCallback(
        async (
            songId: string,
            entry: CreateCallGuideEntryInput,
            userId: string
        ): Promise<CallGuideEntry | null> => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return null;

            if (useSupabase && isValidUUID(guide.id)) {
                try {
                    const newEntry = await addCallGuideEntryInDb(guide.id, entry);

                    const newEntries = [...guide.entries, newEntry].sort(
                        (a, b) => a.startTime - b.startTime
                    );

                    setCallGuides((prev) =>
                        prev.map((g) =>
                            g.id === guide.id
                                ? { ...g, entries: newEntries, updatedAt: new Date() }
                                : g
                        )
                    );

                    return newEntry;
                } catch (error) {
                    console.error("[CallGuideContext] Failed to add entry:", error);
                    return null;
                }
            } else {
                // Mock 모드
                const newEntry: CallGuideEntry = {
                    id: generateId(),
                    ...entry,
                };

                const newEntries = [...guide.entries, newEntry].sort(
                    (a, b) => a.startTime - b.startTime
                );
                await updateCallGuide(songId, newEntries, userId, `엔트리 추가: ${entry.text}`);

                return newEntry;
            }
        },
        [callGuides, useSupabase, updateCallGuide]
    );

    // 엔트리 수정
    const updateEntry = useCallback(
        async (
            songId: string,
            entryId: string,
            entry: Partial<CallGuideEntryInput>,
            userId: string
        ): Promise<boolean> => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return false;

            const entryIndex = guide.entries.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) return false;

            if (useSupabase && isValidUUID(entryId)) {
                try {
                    await updateCallGuideEntryInDb(entryId, entry);

                    const newEntries = [...guide.entries];
                    newEntries[entryIndex] = { ...newEntries[entryIndex], ...entry };
                    newEntries.sort((a, b) => a.startTime - b.startTime);

                    setCallGuides((prev) =>
                        prev.map((g) =>
                            g.id === guide.id
                                ? { ...g, entries: newEntries, updatedAt: new Date() }
                                : g
                        )
                    );

                    return true;
                } catch (error) {
                    console.error("[CallGuideContext] Failed to update entry:", error);
                    return false;
                }
            } else {
                // Mock 모드
                const newEntries = [...guide.entries];
                newEntries[entryIndex] = { ...newEntries[entryIndex], ...entry };
                newEntries.sort((a, b) => a.startTime - b.startTime);

                await updateCallGuide(songId, newEntries, userId, `엔트리 수정`);
                return true;
            }
        },
        [callGuides, useSupabase, updateCallGuide]
    );

    // 엔트리 삭제
    const deleteEntry = useCallback(
        async (songId: string, entryId: string, userId: string): Promise<boolean> => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return false;

            if (useSupabase && isValidUUID(entryId)) {
                try {
                    await deleteCallGuideEntryInDb(entryId);

                    const newEntries = guide.entries.filter((e) => e.id !== entryId);

                    setCallGuides((prev) =>
                        prev.map((g) =>
                            g.id === guide.id
                                ? { ...g, entries: newEntries, updatedAt: new Date() }
                                : g
                        )
                    );

                    return true;
                } catch (error) {
                    console.error("[CallGuideContext] Failed to delete entry:", error);
                    return false;
                }
            } else {
                // Mock 모드
                const newEntries = guide.entries.filter((e) => e.id !== entryId);
                await updateCallGuide(songId, newEntries, userId, `엔트리 삭제`);
                return true;
            }
        },
        [callGuides, useSupabase, updateCallGuide]
    );

    // 버전 히스토리
    const getVersionHistory = useCallback(
        (callGuideId: string) => {
            return versions
                .filter((v) => v.callGuideId === callGuideId)
                .sort((a, b) => b.version - a.version);
        },
        [versions]
    );

    // 도움됨 토글
    const toggleHelpful = useCallback(
        async (callGuideId: string) => {
            if (useSupabase && currentUserId && isValidUUID(currentUserId) && isValidUUID(callGuideId)) {
                try {
                    const result = await toggleCallGuideReactionInDb(currentUserId, callGuideId);

                    // 도움됨 상태 업데이트
                    setHelpfulGuides((prev) => {
                        const newSet = new Set(prev);
                        if (result.isHelpful) {
                            newSet.add(callGuideId);
                        } else {
                            newSet.delete(callGuideId);
                        }
                        return newSet;
                    });

                    // 콜가이드의 helpfulCount 즉시 업데이트
                    setCallGuides((prev) =>
                        prev.map((g) =>
                            g.id === callGuideId
                                ? { ...g, helpfulCount: result.newCount }
                                : g
                        )
                    );
                } catch (error) {
                    console.error("[CallGuideContext] Failed to toggle helpful:", error);
                }
            } else {
                // Mock 모드
                setHelpfulGuides((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(callGuideId)) {
                        newSet.delete(callGuideId);
                    } else {
                        newSet.add(callGuideId);
                    }
                    return newSet;
                });

                setHelpfulDelta((prev) => {
                    const newMap = new Map(prev);
                    const currentDelta = newMap.get(callGuideId) || 0;
                    if (helpfulGuides.has(callGuideId)) {
                        newMap.set(callGuideId, currentDelta - 1);
                    } else {
                        newMap.set(callGuideId, currentDelta + 1);
                    }
                    return newMap;
                });
            }
        },
        [useSupabase, currentUserId, helpfulGuides]
    );

    const isHelpful = useCallback(
        (callGuideId: string) => {
            return helpfulGuides.has(callGuideId);
        },
        [helpfulGuides]
    );

    const getHelpfulCount = useCallback(
        (callGuideId: string, originalCount: number) => {
            // Supabase 모드이고 callGuideId가 UUID일 때만 서버 데이터 사용
            if (useSupabase && isValidUUID(callGuideId)) {
                return originalCount;
            }
            // Mock 데이터거나 callGuideId가 UUID가 아니면 delta 적용
            const delta = helpfulDelta.get(callGuideId) || 0;
            return Math.max(0, originalCount + delta);
        },
        [useSupabase, helpfulDelta]
    );

    // ===== 개별 엔트리 도움됨 =====

    const toggleEntryHelpful = useCallback(
        async (callGuideId: string, entryId: string) => {
            if (useSupabase && currentUserId && isValidUUID(currentUserId) && isValidUUID(entryId)) {
                try {
                    const result = await toggleEntryReactionInDb(currentUserId, entryId);

                    // 도움됨 상태 업데이트
                    setHelpfulEntries((prev) => {
                        const newSet = new Set(prev);
                        if (result.isHelpful) {
                            newSet.add(entryId);
                        } else {
                            newSet.delete(entryId);
                        }
                        return newSet;
                    });

                    // 콜가이드 엔트리의 helpfulCount 즉시 업데이트
                    setCallGuides((prev) =>
                        prev.map((g) => {
                            if (g.id === callGuideId) {
                                return {
                                    ...g,
                                    entries: g.entries.map((e) =>
                                        e.id === entryId
                                            ? { ...e, helpfulCount: result.newCount }
                                            : e
                                    ),
                                };
                            }
                            return g;
                        })
                    );
                } catch (error) {
                    console.error("[CallGuideContext] Failed to toggle entry helpful:", error);
                }
            } else {
                // Mock 모드
                setHelpfulEntries((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(entryId)) {
                        newSet.delete(entryId);
                    } else {
                        newSet.add(entryId);
                    }
                    return newSet;
                });

                setHelpfulEntryDelta((prev) => {
                    const newMap = new Map(prev);
                    const currentDelta = newMap.get(entryId) || 0;
                    if (helpfulEntries.has(entryId)) {
                        newMap.set(entryId, currentDelta - 1);
                    } else {
                        newMap.set(entryId, currentDelta + 1);
                    }
                    return newMap;
                });
            }
        },
        [useSupabase, currentUserId, helpfulEntries]
    );

    const isEntryHelpful = useCallback(
        (entryId: string) => {
            return helpfulEntries.has(entryId);
        },
        [helpfulEntries]
    );

    const getEntryHelpfulCount = useCallback(
        (entryId: string, originalCount: number) => {
            // Supabase 모드이고 entryId가 UUID일 때만 서버 데이터 사용
            if (useSupabase && isValidUUID(entryId)) {
                return originalCount;
            }
            // Mock 데이터거나 entryId가 UUID가 아니면 delta 적용
            const delta = helpfulEntryDelta.get(entryId) || 0;
            return Math.max(0, originalCount + delta);
        },
        [useSupabase, helpfulEntryDelta]
    );

    const value = useMemo<CallGuideContextType>(
        () => ({
            songs,
            getSong,
            getSongsByArtist,
            addSong,
            callGuides,
            getCallGuide,
            createCallGuide,
            updateCallGuide,
            addEntry,
            updateEntry,
            deleteEntry,
            versions,
            getVersionHistory,
            toggleHelpful,
            isHelpful,
            getHelpfulCount,
            toggleEntryHelpful,
            isEntryHelpful,
            getEntryHelpfulCount,
            isLoaded,
            isFromSupabase,
            refreshCallGuides,
        }),
        [
            songs,
            getSong,
            getSongsByArtist,
            addSong,
            callGuides,
            getCallGuide,
            createCallGuide,
            updateCallGuide,
            addEntry,
            updateEntry,
            deleteEntry,
            versions,
            getVersionHistory,
            toggleHelpful,
            isHelpful,
            getHelpfulCount,
            toggleEntryHelpful,
            isEntryHelpful,
            getEntryHelpfulCount,
            isLoaded,
            isFromSupabase,
            refreshCallGuides,
        ]
    );

    return (
        <CallGuideContext.Provider value={value}>
            {children}
        </CallGuideContext.Provider>
    );
}

export function useCallGuide() {
    const context = useContext(CallGuideContext);
    if (context === undefined) {
        throw new Error("useCallGuide must be used within a CallGuideProvider");
    }
    return context;
}
