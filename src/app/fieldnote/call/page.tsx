"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Music, TrendingUp, Clock, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CallGuideList, CallGuideCard } from "@/components/call-guide";
import {
    MOCK_CALL_GUIDES,
    MOCK_CALL_GUIDE_ARTISTS,
    getMockPopularCallGuides,
    getMockRecentCallGuides,
} from "@/lib/mock-call-guide";

type ViewMode = "popular" | "recent" | "artist";

/**
 * 콜가이드 목록 페이지 (/fieldnote/call)
 * 호응법 전체 보기
 */
export default function CallGuideListPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("popular");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

    const popularGuides = useMemo(() => getMockPopularCallGuides(10), []);
    const recentGuides = useMemo(() => getMockRecentCallGuides(10), []);

    const filteredGuides = useMemo(() => {
        let guides = MOCK_CALL_GUIDES;

        if (selectedArtist) {
            guides = guides.filter((g) => g.song?.artistId === selectedArtist);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            guides = guides.filter(
                (g) =>
                    g.song?.title.toLowerCase().includes(query) ||
                    g.song?.artistName.toLowerCase().includes(query)
            );
        }

        return guides;
    }, [selectedArtist, searchQuery]);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="px-4 py-3">
                    <h1 className="text-xl font-bold">호응법</h1>
                    <p className="text-sm text-muted-foreground">
                        아티스트별 호응법을 확인하고 편집하세요
                    </p>
                </div>

                {/* 검색 */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="곡 또는 아티스트 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                        />
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex border-b">
                    <button
                        onClick={() => {
                            setViewMode("popular");
                            setSelectedArtist(null);
                        }}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                            viewMode === "popular"
                                ? "border-purple-600 text-purple-600"
                                : "border-transparent text-muted-foreground"
                        )}
                    >
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        인기
                    </button>
                    <button
                        onClick={() => {
                            setViewMode("recent");
                            setSelectedArtist(null);
                        }}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                            viewMode === "recent"
                                ? "border-purple-600 text-purple-600"
                                : "border-transparent text-muted-foreground"
                        )}
                    >
                        <Clock className="h-4 w-4 inline mr-1" />
                        최근
                    </button>
                    <button
                        onClick={() => setViewMode("artist")}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                            viewMode === "artist"
                                ? "border-purple-600 text-purple-600"
                                : "border-transparent text-muted-foreground"
                        )}
                    >
                        <Users className="h-4 w-4 inline mr-1" />
                        아티스트
                    </button>
                </div>
            </div>

            {/* 검색 결과 */}
            {searchQuery && (
                <div className="p-4">
                    <h2 className="text-sm text-muted-foreground mb-3">
                        &quot;{searchQuery}&quot; 검색 결과 ({filteredGuides.length}개)
                    </h2>
                    <CallGuideList callGuides={filteredGuides} />
                </div>
            )}

            {/* 인기 탭 */}
            {!searchQuery && viewMode === "popular" && (
                <div className="p-4 space-y-6">
                    {/* 인기 콜가이드 카드 */}
                    <div>
                        <h2 className="font-bold mb-3">인기 콜가이드</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {popularGuides.slice(0, 4).map((guide) => (
                                <CallGuideCard key={guide.id} callGuide={guide} />
                            ))}
                        </div>
                    </div>

                    {/* 나머지 리스트 */}
                    {popularGuides.length > 4 && (
                        <CallGuideList
                            callGuides={popularGuides.slice(4)}
                            title="더 많은 인기 콜가이드"
                        />
                    )}
                </div>
            )}

            {/* 최근 탭 */}
            {!searchQuery && viewMode === "recent" && (
                <div className="p-4">
                    <CallGuideList callGuides={recentGuides} title="최근 업데이트" />
                </div>
            )}

            {/* 아티스트 탭 */}
            {!searchQuery && viewMode === "artist" && (
                <div className="p-4">
                    {!selectedArtist ? (
                        <div className="space-y-2">
                            <h2 className="font-bold mb-3">아티스트별 콜가이드</h2>
                            {MOCK_CALL_GUIDE_ARTISTS.map((artist) => (
                                <button
                                    key={artist.id}
                                    onClick={() => setSelectedArtist(artist.id)}
                                    className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Music className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">{artist.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {artist.songCount}곡 · {artist.guideCount}개 콜가이드
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={() => setSelectedArtist(null)}
                                className="flex items-center gap-1 text-sm text-purple-600 mb-4"
                            >
                                ← 전체 아티스트
                            </button>
                            <CallGuideList
                                callGuides={filteredGuides}
                                title={
                                    MOCK_CALL_GUIDE_ARTISTS.find((a) => a.id === selectedArtist)
                                        ?.name
                                }
                                showArtist={false}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 플로팅 버튼 - 새 콜가이드 작성 */}
            <Link
                href="/fieldnote/call/new"
                className={cn(
                    "fixed bottom-20 right-4 z-20",
                    "flex items-center gap-2 px-4 py-3 rounded-full",
                    "bg-purple-600 text-white shadow-lg",
                    "hover:bg-purple-700 transition-colors"
                )}
            >
                <Music className="h-5 w-5" />
                새 콜가이드
            </Link>
        </div>
    );
}
