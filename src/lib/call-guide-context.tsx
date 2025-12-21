"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
    Song,
    CallGuide,
    CallGuideEntry,
    CallGuideVersion,
    CreateCallGuideInput,
    CreateCallGuideEntryInput,
    CreateSongInput,
} from "@/types/call-guide";

interface CallGuideContextType {
    // 곡 관련
    songs: Song[];
    getSong: (songId: string) => Song | undefined;
    getSongsByArtist: (artistId: string) => Song[];
    addSong: (input: CreateSongInput) => Song;

    // 콜가이드 관련
    callGuides: CallGuide[];
    getCallGuide: (songId: string) => CallGuide | undefined;
    createCallGuide: (input: CreateCallGuideInput, userId: string) => CallGuide;
    updateCallGuide: (
        songId: string,
        entries: CallGuideEntry[],
        userId: string,
        changeDescription?: string
    ) => CallGuide | undefined;

    // 콜가이드 엔트리 관련
    addEntry: (songId: string, entry: CreateCallGuideEntryInput, userId: string) => CallGuideEntry | undefined;
    updateEntry: (songId: string, entryId: string, entry: Partial<CallGuideEntryInput>, userId: string) => boolean;
    deleteEntry: (songId: string, entryId: string, userId: string) => boolean;

    // 버전 히스토리
    versions: CallGuideVersion[];
    getVersionHistory: (callGuideId: string) => CallGuideVersion[];

    // 도움됨
    toggleHelpful: (callGuideId: string) => void;
    isHelpful: (callGuideId: string) => boolean;
    getHelpfulCount: (callGuideId: string, originalCount: number) => number;

    // 로딩 상태
    isLoaded: boolean;
}

type CallGuideEntryInput = Omit<CallGuideEntry, "id">;

const CallGuideContext = createContext<CallGuideContextType | undefined>(undefined);

const STORAGE_KEY_SONGS = "fesmate_songs";
const STORAGE_KEY_CALL_GUIDES = "fesmate_call_guides";
const STORAGE_KEY_VERSIONS = "fesmate_call_guide_versions";
const STORAGE_KEY_HELPFUL = "fesmate_call_guide_helpful";

// UUID 생성 헬퍼
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function CallGuideProvider({ children }: { children: React.ReactNode }) {
    const [songs, setSongs] = useState<Song[]>([]);
    const [callGuides, setCallGuides] = useState<CallGuide[]>([]);
    const [versions, setVersions] = useState<CallGuideVersion[]>([]);
    const [helpfulGuides, setHelpfulGuides] = useState<Set<string>>(new Set());
    const [helpfulDelta, setHelpfulDelta] = useState<Map<string, number>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    // localStorage에서 로드
    useEffect(() => {
        try {
            // Songs
            const storedSongs = localStorage.getItem(STORAGE_KEY_SONGS);
            if (storedSongs) {
                setSongs(JSON.parse(storedSongs));
            }

            // Call Guides
            const storedGuides = localStorage.getItem(STORAGE_KEY_CALL_GUIDES);
            if (storedGuides) {
                const parsed = JSON.parse(storedGuides);
                // Date 복원
                const restored = parsed.map((g: CallGuide) => ({
                    ...g,
                    createdAt: new Date(g.createdAt),
                    updatedAt: new Date(g.updatedAt),
                }));
                setCallGuides(restored);
            }

            // Versions
            const storedVersions = localStorage.getItem(STORAGE_KEY_VERSIONS);
            if (storedVersions) {
                const parsed = JSON.parse(storedVersions);
                const restored = parsed.map((v: CallGuideVersion) => ({
                    ...v,
                    editedAt: new Date(v.editedAt),
                }));
                setVersions(restored);
            }

            // Helpful
            const storedHelpful = localStorage.getItem(STORAGE_KEY_HELPFUL);
            if (storedHelpful) {
                const data = JSON.parse(storedHelpful);
                setHelpfulGuides(new Set(data.guides || []));
                setHelpfulDelta(new Map(Object.entries(data.delta || {})));
            }
        } catch (e) {
            console.error("Failed to load call guide state:", e);
        }
        setIsLoaded(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(STORAGE_KEY_SONGS, JSON.stringify(songs));
            localStorage.setItem(STORAGE_KEY_CALL_GUIDES, JSON.stringify(callGuides));
            localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(versions));
            localStorage.setItem(
                STORAGE_KEY_HELPFUL,
                JSON.stringify({
                    guides: Array.from(helpfulGuides),
                    delta: Object.fromEntries(helpfulDelta),
                })
            );
        } catch (e) {
            console.error("Failed to save call guide state:", e);
        }
    }, [songs, callGuides, versions, helpfulGuides, helpfulDelta, isLoaded]);

    // 곡 관련 함수
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

    const addSong = useCallback((input: CreateSongInput): Song => {
        const newSong: Song = {
            id: generateId(),
            ...input,
            hasCallGuide: false,
        };
        setSongs((prev) => [...prev, newSong]);
        return newSong;
    }, []);

    // 콜가이드 관련 함수
    const getCallGuide = useCallback(
        (songId: string) => {
            return callGuides.find((g) => g.songId === songId);
        },
        [callGuides]
    );

    const createCallGuide = useCallback(
        (input: CreateCallGuideInput, userId: string): CallGuide => {
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

            // 곡의 hasCallGuide 업데이트
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
        },
        []
    );

    const updateCallGuide = useCallback(
        (
            songId: string,
            entries: CallGuideEntry[],
            userId: string,
            changeDescription?: string
        ): CallGuide | undefined => {
            let updatedGuide: CallGuide | undefined;

            setCallGuides((prev) =>
                prev.map((g) => {
                    if (g.songId === songId) {
                        const newVersion = g.version + 1;
                        const contributors = g.contributors.includes(userId)
                            ? g.contributors
                            : [...g.contributors, userId];

                        updatedGuide = {
                            ...g,
                            entries,
                            version: newVersion,
                            contributors,
                            updatedAt: new Date(),
                        };

                        // 버전 히스토리 추가
                        const versionEntry: CallGuideVersion = {
                            id: generateId(),
                            callGuideId: g.id,
                            version: newVersion,
                            entries,
                            editedBy: userId,
                            editedAt: new Date(),
                            changeDescription,
                        };
                        setVersions((prevVersions) => [...prevVersions, versionEntry]);

                        return updatedGuide;
                    }
                    return g;
                })
            );

            return updatedGuide;
        },
        []
    );

    // 엔트리 관련 함수
    const addEntry = useCallback(
        (
            songId: string,
            entry: CreateCallGuideEntryInput,
            userId: string
        ): CallGuideEntry | undefined => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return undefined;

            const newEntry: CallGuideEntry = {
                id: generateId(),
                ...entry,
            };

            const newEntries = [...guide.entries, newEntry].sort(
                (a, b) => a.startTime - b.startTime
            );
            updateCallGuide(songId, newEntries, userId, `엔트리 추가: ${entry.text}`);

            return newEntry;
        },
        [callGuides, updateCallGuide]
    );

    const updateEntry = useCallback(
        (
            songId: string,
            entryId: string,
            entry: Partial<CallGuideEntryInput>,
            userId: string
        ): boolean => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return false;

            const entryIndex = guide.entries.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) return false;

            const newEntries = [...guide.entries];
            newEntries[entryIndex] = { ...newEntries[entryIndex], ...entry };
            newEntries.sort((a, b) => a.startTime - b.startTime);

            updateCallGuide(songId, newEntries, userId, `엔트리 수정`);
            return true;
        },
        [callGuides, updateCallGuide]
    );

    const deleteEntry = useCallback(
        (songId: string, entryId: string, userId: string): boolean => {
            const guide = callGuides.find((g) => g.songId === songId);
            if (!guide) return false;

            const newEntries = guide.entries.filter((e) => e.id !== entryId);
            updateCallGuide(songId, newEntries, userId, `엔트리 삭제`);
            return true;
        },
        [callGuides, updateCallGuide]
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

    // 도움됨
    const toggleHelpful = useCallback((callGuideId: string) => {
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
    }, [helpfulGuides]);

    const isHelpful = useCallback(
        (callGuideId: string) => {
            return helpfulGuides.has(callGuideId);
        },
        [helpfulGuides]
    );

    const getHelpfulCount = useCallback(
        (callGuideId: string, originalCount: number) => {
            const delta = helpfulDelta.get(callGuideId) || 0;
            return Math.max(0, originalCount + delta);
        },
        [helpfulDelta]
    );

    return (
        <CallGuideContext.Provider
            value={{
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
                isLoaded,
            }}
        >
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
