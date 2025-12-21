"use client";

import React, { useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { CallGuideEditor } from "@/components/call-guide";
import { getMockCallGuideBySongId, MOCK_SONGS, MOCK_CALL_GUIDES } from "@/lib/mock-call-guide";
import { useCallGuide } from "@/lib/call-guide-context";
import { useDevContext } from "@/lib/dev-context";
import { CallGuide, CallGuideEntry } from "@/types/call-guide";

interface PageProps {
    params: Promise<{ songId: string }>;
}

export default function CallGuideEditPage({ params }: PageProps) {
    const { songId } = use(params);
    const router = useRouter();
    const { updateCallGuide, createCallGuide } = useCallGuide();
    const { mockUserId, isLoggedIn } = useDevContext();

    // Mock 데이터에서 콜가이드 찾기
    const existingGuide = useMemo(() => {
        return getMockCallGuideBySongId(songId);
    }, [songId]);

    const song = useMemo(() => {
        return MOCK_SONGS.find((s) => s.id === songId);
    }, [songId]);

    // 새 콜가이드를 위한 빈 템플릿
    const callGuide: CallGuide = useMemo(() => {
        if (existingGuide) {
            return existingGuide;
        }

        const userId = mockUserId || "guest";

        if (song) {
            return {
                id: `new-${songId}`,
                songId,
                song,
                entries: [],
                createdBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
                contributors: [userId],
                status: "draft",
                helpfulCount: 0,
            };
        }

        return null as unknown as CallGuide;
    }, [existingGuide, song, songId, mockUserId]);

    if (!song) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg font-medium mb-2">곡을 찾을 수 없습니다</p>
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-purple-600"
                    >
                        ← 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg font-medium mb-2">로그인이 필요합니다</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        콜가이드를 편집하려면 로그인해주세요.
                    </p>
                    <button
                        onClick={() => router.push("/login")}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                    >
                        로그인하기
                    </button>
                </div>
            </div>
        );
    }

    const userId = mockUserId || "guest";

    const handleSave = (entries: CallGuideEntry[], changeDescription?: string) => {
        if (existingGuide) {
            // 기존 콜가이드 업데이트
            updateCallGuide(songId, entries, userId, changeDescription);
        } else {
            // 새 콜가이드 생성
            createCallGuide({ songId, entries }, userId);
        }

        // Mock 데이터도 업데이트 (실제로는 서버에서 처리)
        const guideIndex = MOCK_CALL_GUIDES.findIndex((g) => g.songId === songId);
        if (guideIndex !== -1) {
            MOCK_CALL_GUIDES[guideIndex] = {
                ...MOCK_CALL_GUIDES[guideIndex],
                entries,
                version: MOCK_CALL_GUIDES[guideIndex].version + 1,
                updatedAt: new Date(),
                contributors: Array.from(
                    new Set([...MOCK_CALL_GUIDES[guideIndex].contributors, userId])
                ),
            };
        }

        router.push(`/fieldnote/call/${songId}`);
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="min-h-screen bg-background">
            <CallGuideEditor
                callGuide={callGuide}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        </div>
    );
}
