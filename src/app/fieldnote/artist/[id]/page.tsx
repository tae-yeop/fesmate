"use client";

import React, { useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Music,
    Users,
    ChevronRight,
    Plus,
    Instagram,
    Youtube,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MOCK_CALL_GUIDE_ARTISTS,
    MOCK_SONGS,
    MOCK_CALL_GUIDES,
    getMockSongsByArtist,
} from "@/lib/mock-call-guide";
import { formatTime } from "@/types/call-guide";

interface PageProps {
    params: Promise<{ id: string }>;
}

/**
 * 아티스트 상세 페이지
 * - 아티스트 프로필
 * - 곡별 콜가이드 목록
 * - 셋리스트 (향후)
 * - 예정 공연 (향후)
 */
export default function ArtistDetailPage({ params }: PageProps) {
    const { id: artistId } = use(params);
    const router = useRouter();

    const artist = useMemo(() => {
        return MOCK_CALL_GUIDE_ARTISTS.find((a) => a.id === artistId);
    }, [artistId]);

    const songs = useMemo(() => {
        return getMockSongsByArtist(artistId);
    }, [artistId]);

    const songsWithGuides = useMemo(() => {
        return songs.map((song) => {
            const guide = MOCK_CALL_GUIDES.find((g) => g.songId === song.id);
            return { song, guide };
        });
    }, [songs]);

    if (!artist) {
        return (
            <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
                <div className="text-center">
                    <Music className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">아티스트를 찾을 수 없습니다</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-purple-600 text-sm"
                    >
                        ← 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center px-4 py-3 gap-3">
                    <button onClick={() => router.back()} className="p-1">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-lg font-bold">아티스트</h1>
                </div>
            </div>

            {/* 아티스트 프로필 */}
            <div className="p-4 border-b">
                <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Music className="h-10 w-10 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold">{artist.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            K-pop · 등록 곡 {artist.songCount}곡
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <button className="px-3 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-full">
                                팔로우
                            </button>
                            <button className="p-1.5 text-muted-foreground hover:text-pink-500">
                                <Instagram className="h-5 w-5" />
                            </button>
                            <button className="p-1.5 text-muted-foreground hover:text-red-500">
                                <Youtube className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 호응법 섹션 */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">호응법</h3>
                    <button className="flex items-center gap-1 text-sm text-purple-600">
                        <Plus className="h-4 w-4" />
                        곡 추가
                    </button>
                </div>

                <div className="space-y-3">
                    {songsWithGuides.map(({ song, guide }) => (
                        <div
                            key={song.id}
                            className="border rounded-lg overflow-hidden"
                        >
                            <div className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                        <Music className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{song.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatTime(song.duration)} · {song.album}
                                        </div>
                                    </div>
                                </div>

                                {guide ? (
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                기여자 {guide.contributors.length}명
                                            </span>
                                            <span className="mx-2">·</span>
                                            <span>도움됨 {guide.helpfulCount}</span>
                                            {guide.status === "verified" && (
                                                <>
                                                    <span className="mx-2">·</span>
                                                    <span className="text-green-600">✓ 검증됨</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/fieldnote/call/${song.id}`}
                                                className="px-3 py-1 text-xs font-medium text-purple-600 border border-purple-600 rounded-full hover:bg-purple-50"
                                            >
                                                ▶ 보기
                                            </Link>
                                            <Link
                                                href={`/fieldnote/call/${song.id}/edit`}
                                                className="px-3 py-1 text-xs font-medium text-muted-foreground border rounded-full hover:bg-gray-50"
                                            >
                                                ✏️ 편집
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            아직 호응법이 없습니다
                                        </div>
                                        <Link
                                            href={`/fieldnote/call/new?songId=${song.id}`}
                                            className="px-3 py-1 text-xs font-medium text-purple-600 border border-purple-600 rounded-full hover:bg-purple-50"
                                        >
                                            + 호응법 만들기
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 셋리스트 섹션 (Coming Soon) */}
            <div className="p-4 border-t">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">셋리스트</h3>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                </div>
                <div className="space-y-2 opacity-60">
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">2024.12.01 서울 콘서트</div>
                            <div className="text-xs text-muted-foreground">18곡</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">2024.11.15 부산 콘서트</div>
                            <div className="text-xs text-muted-foreground">17곡</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* 예정 공연 섹션 (Coming Soon) */}
            <div className="p-4 border-t">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">예정 공연</h3>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                </div>
                <div className="opacity-60">
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">2025.01.15 록페스티벌 2025</div>
                            <div className="text-xs text-muted-foreground">
                                서울 올림픽공원
                            </div>
                        </div>
                        <ExternalLink className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
