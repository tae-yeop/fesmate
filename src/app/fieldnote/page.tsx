"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Music, TrendingUp, Clock, ChevronRight, Users, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CallGuideList, CallGuideCard } from "@/components/call-guide";
import {
    MOCK_CALL_GUIDES,
    MOCK_CALL_GUIDE_ARTISTS,
    getMockPopularCallGuides,
    getMockRecentCallGuides,
} from "@/lib/mock-call-guide";

/**
 * FieldNote 홈 페이지
 * - 호응법 (콘서트): 아티스트별/인기/최근
 * - 향후 확장: 뮤지컬/클래식/전시 가이드
 */
export default function FieldNotePage() {
    const [searchQuery, setSearchQuery] = useState("");

    const popularGuides = useMemo(() => getMockPopularCallGuides(6), []);
    const recentGuides = useMemo(() => getMockRecentCallGuides(5), []);

    const filteredGuides = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase();
        return MOCK_CALL_GUIDES.filter(
            (g) =>
                g.song?.title.toLowerCase().includes(query) ||
                g.song?.artistName.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="px-4 py-3">
                    <h1 className="text-xl font-bold">FieldNote</h1>
                    <p className="text-sm text-muted-foreground">
                        현장에서 수집한 생생한 공연 정보
                    </p>
                </div>

                {/* 검색 */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="아티스트, 곡, 공연 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* 검색 결과 */}
            {searchQuery && (
                <div className="p-4">
                    <h2 className="text-sm text-muted-foreground mb-3">
                        &quot;{searchQuery}&quot; 검색 결과 ({filteredGuides.length}개)
                    </h2>
                    {filteredGuides.length > 0 ? (
                        <CallGuideList callGuides={filteredGuides} />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>검색 결과가 없습니다</p>
                        </div>
                    )}
                </div>
            )}

            {/* 메인 콘텐츠 */}
            {!searchQuery && (
                <div className="p-4 space-y-6">
                    {/* 호응법 섹션 */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold flex items-center gap-2">
                                <Mic2 className="h-5 w-5 text-purple-600" />
                                호응법
                            </h2>
                            <Link
                                href="/fieldnote/call"
                                className="text-sm text-purple-600 flex items-center"
                            >
                                전체보기 <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>

                        {/* 아티스트 가로 스크롤 */}
                        <div className="overflow-x-auto -mx-4 px-4 pb-2">
                            <div className="flex gap-3">
                                {MOCK_CALL_GUIDE_ARTISTS.slice(0, 6).map((artist) => (
                                    <Link
                                        key={artist.id}
                                        href={`/fieldnote/artist/${artist.id}`}
                                        className="flex-shrink-0 w-20 text-center"
                                    >
                                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-1">
                                            <Music className="h-7 w-7 text-purple-600" />
                                        </div>
                                        <div className="text-sm font-medium truncate">
                                            {artist.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {artist.guideCount}곡
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 인기 가이드 */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-orange-500" />
                                인기 가이드
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {popularGuides.slice(0, 4).map((guide) => (
                                <CallGuideCard key={guide.id} callGuide={guide} />
                            ))}
                        </div>
                    </section>

                    {/* 최근 수정 */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                최근 수정
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {recentGuides.map((guide) => (
                                <Link
                                    key={guide.id}
                                    href={`/fieldnote/call/${guide.songId}`}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                                            <Music className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">
                                                {guide.song?.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {guide.song?.artistName} · 기여자 {guide.contributors.length}명
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Coming Soon: 다른 가이드 유형 */}
                    <section className="border-t pt-6">
                        <h2 className="font-bold text-muted-foreground mb-3">Coming Soon</h2>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-gray-50 text-center opacity-60">
                                <div className="text-2xl mb-1">🎭</div>
                                <div className="text-xs font-medium">뮤지컬</div>
                                <div className="text-xs text-muted-foreground">커튼콜</div>
                            </div>
                            <div className="p-3 rounded-lg bg-gray-50 text-center opacity-60">
                                <div className="text-2xl mb-1">🎻</div>
                                <div className="text-xs font-medium">클래식</div>
                                <div className="text-xs text-muted-foreground">박수 가이드</div>
                            </div>
                            <div className="p-3 rounded-lg bg-gray-50 text-center opacity-60">
                                <div className="text-2xl mb-1">🖼️</div>
                                <div className="text-xs font-medium">전시</div>
                                <div className="text-xs text-muted-foreground">관람 가이드</div>
                            </div>
                        </div>
                    </section>
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
