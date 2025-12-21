"use client";

import React, { useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3 } from "lucide-react";
import { CallGuideViewer } from "@/components/call-guide";
import { getMockCallGuideBySongId, MOCK_SONGS } from "@/lib/mock-call-guide";
import { useCallGuide } from "@/lib/call-guide-context";
import { useDevContext } from "@/lib/dev-context";

interface PageProps {
    params: Promise<{ songId: string }>;
}

export default function CallGuideViewPage({ params }: PageProps) {
    const { songId } = use(params);
    const router = useRouter();
    const { toggleHelpful, isHelpful, getHelpfulCount } = useCallGuide();
    const { isLoggedIn } = useDevContext();

    // Mock 데이터에서 콜가이드 찾기
    const callGuide = useMemo(() => {
        return getMockCallGuideBySongId(songId);
    }, [songId]);

    const song = useMemo(() => {
        return MOCK_SONGS.find((s) => s.id === songId);
    }, [songId]);

    if (!callGuide) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg font-medium mb-2">콜가이드를 찾을 수 없습니다</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        {song ? `"${song.title}" 곡의 콜가이드가 아직 없습니다.` : "존재하지 않는 곡입니다."}
                    </p>
                    {song && (
                        <button
                            onClick={() => router.push(`/fieldnote/call/${songId}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg mx-auto"
                        >
                            <Edit3 className="h-4 w-4" />
                            콜가이드 작성하기
                        </button>
                    )}
                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-sm text-purple-600"
                    >
                        ← 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const helpful = isHelpful(callGuide.id);
    const helpfulCount = getHelpfulCount(callGuide.id, callGuide.helpfulCount);

    const handleHelpful = () => {
        toggleHelpful(callGuide.id);
    };

    const handleEdit = () => {
        if (!isLoggedIn) {
            alert("로그인이 필요합니다.");
            return;
        }
        router.push(`/fieldnote/call/${songId}/edit`);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => router.back()} className="p-1">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold truncate">{callGuide.song?.title}</h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {callGuide.song?.artistName}
                        </p>
                    </div>
                </div>
            </div>

            {/* 뷰어 */}
            <CallGuideViewer
                callGuide={{ ...callGuide, helpfulCount }}
                onEdit={handleEdit}
                onHelpful={handleHelpful}
                isHelpful={helpful}
            />
        </div>
    );
}
