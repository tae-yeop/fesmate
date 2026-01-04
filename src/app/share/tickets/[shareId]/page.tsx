import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye, Calendar, ArrowLeft, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/utils/date-format";

interface PageParams {
    shareId: string;
}

interface PageProps {
    params: Promise<PageParams>;
}

/**
 * OG 메타데이터 생성
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { shareId } = await params;
    const supabase = await createClient();

    const { data: share } = await supabase
        .from("ticket_shares")
        .select("title, description, ticket_ids, user_id")
        .eq("share_id", shareId)
        .eq("is_public", true)
        .single();

    if (!share) {
        return {
            title: "공유를 찾을 수 없습니다 | FesMate",
        };
    }

    const title = share.title || "티켓 갤러리";
    const description = share.description || `${share.ticket_ids.length}장의 티켓이 공유되었습니다`;

    return {
        title: `${title} | FesMate`,
        description,
        openGraph: {
            title: `[FesMate] ${title}`,
            description,
            type: "website",
            siteName: "FesMate",
        },
        twitter: {
            card: "summary_large_image",
            title: `[FesMate] ${title}`,
            description,
        },
    };
}

/**
 * 공유 티켓 갤러리 페이지
 * - Server Component
 * - 공개 URL 갤러리 렌더링
 * - 조회수 표시
 */
export default async function ShareTicketsPage({ params }: PageProps) {
    const { shareId } = await params;
    const supabase = await createClient();

    // 공유 정보 조회
    const { data: share, error } = await supabase
        .from("ticket_shares")
        .select(`
            *,
            users:user_id (nickname, profile_image)
        `)
        .eq("share_id", shareId)
        .eq("is_public", true)
        .single();

    // 개발 환경에서 test-로 시작하는 shareId는 Mock 데이터로 렌더링
    if (error || !share) {
        if (process.env.NODE_ENV === "development" && shareId.startsWith("test-")) {
            return <MockSharePage shareId={shareId} />;
        }
        notFound();
    }

    // 만료 확인
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
        notFound();
    }

    // 조회수 증가 (비동기, 에러 무시)
    supabase.rpc("increment_share_view_count", { p_share_id: shareId }).then(() => {});

    // 티켓 정보 조회
    const { data: tickets } = await supabase
        .from("tickets")
        .select(`
            id,
            front_image_url,
            front_thumbnail_url,
            event_title,
            event_date,
            seat,
            companion
        `)
        .in("id", share.ticket_ids);

    const user = share.users as { nickname: string; profile_image: string | null } | null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </span>
                    </Link>
                    <button className="p-2 rounded-full hover:bg-muted transition-colors">
                        <Share2 className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Title Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">
                        {share.title || "티켓 갤러리"}
                    </h1>
                    {share.description && (
                        <p className="text-muted-foreground mb-4">
                            {share.description}
                        </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {user && (
                            <div className="flex items-center gap-2">
                                {user.profile_image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={user.profile_image}
                                        alt={user.nickname}
                                        className="w-6 h-6 rounded-full"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {user.nickname?.[0] || "U"}
                                    </div>
                                )}
                                <span>{user.nickname}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatKoreanDate(new Date(share.created_at), "YYYY년 M월 D일")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{share.view_count.toLocaleString()}회 조회</span>
                        </div>
                    </div>
                </div>

                {/* Ticket Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tickets?.map((ticket) => (
                        <div
                            key={ticket.id}
                            className="group relative rounded-xl overflow-hidden bg-muted aspect-[3/4]"
                        >
                            {/* Ticket Image */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={ticket.front_thumbnail_url || ticket.front_image_url}
                                alt={ticket.event_title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                    <p className="font-medium text-sm truncate">
                                        {ticket.event_title}
                                    </p>
                                    <p className="text-xs opacity-80">
                                        {formatKoreanDate(new Date(ticket.event_date), "YYYY.MM.DD")}
                                    </p>
                                    {ticket.seat && (
                                        <p className="text-xs opacity-70 mt-0.5">
                                            {ticket.seat}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {(!tickets || tickets.length === 0) && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🎫</div>
                        <h3 className="text-xl font-bold mb-2">티켓이 없습니다</h3>
                        <p className="text-muted-foreground">
                            공유된 티켓을 찾을 수 없습니다.
                        </p>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-12 text-center">
                    <p className="text-muted-foreground mb-4">
                        나만의 공연 기록을 만들어보세요
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        FesMate 시작하기
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-8 mt-16">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </span>
                        {" - "}공연과 페스티벌의 모든 것
                    </p>
                </div>
            </footer>
        </div>
    );
}

/**
 * Mock 공유 페이지 (개발 전용)
 * - Supabase 연결 없이 UI 테스트 가능
 */
function MockSharePage({ shareId }: { shareId: string }) {
    const mockTickets = [
        {
            id: "mock-1",
            front_image_url: "https://picsum.photos/seed/ticket1/400/533",
            front_thumbnail_url: "https://picsum.photos/seed/ticket1/400/533",
            event_title: "THE MARCHING OF AG! TOUR IN SEOUL",
            event_date: "2026-02-02",
            seat: "A구역 12열 34번",
        },
        {
            id: "mock-2",
            front_image_url: "https://picsum.photos/seed/ticket2/400/533",
            front_thumbnail_url: "https://picsum.photos/seed/ticket2/400/533",
            event_title: "2025 록페스티벌",
            event_date: "2025-08-15",
            seat: "스탠딩",
        },
        {
            id: "mock-3",
            front_image_url: "https://picsum.photos/seed/ticket3/400/533",
            front_thumbnail_url: "https://picsum.photos/seed/ticket3/400/533",
            event_title: "인디밴드 페스티벌",
            event_date: "2025-09-20",
            seat: null,
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </span>
                    </Link>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                        개발 모드
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Title Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">
                        테스트 티켓 갤러리
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        개발용 Mock 데이터입니다 (shareId: {shareId})
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                T
                            </div>
                            <span>테스트 유저</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatKoreanDate(new Date(), "YYYY년 M월 D일")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>42회 조회</span>
                        </div>
                    </div>
                </div>

                {/* Ticket Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mockTickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            className="group relative rounded-xl overflow-hidden bg-muted aspect-[3/4]"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={ticket.front_thumbnail_url || ticket.front_image_url}
                                alt={ticket.event_title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                    <p className="font-medium text-sm truncate">
                                        {ticket.event_title}
                                    </p>
                                    <p className="text-xs opacity-80">
                                        {formatKoreanDate(new Date(ticket.event_date), "YYYY.MM.DD")}
                                    </p>
                                    {ticket.seat && (
                                        <p className="text-xs opacity-70 mt-0.5">
                                            {ticket.seat}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <p className="text-muted-foreground mb-4">
                        나만의 공연 기록을 만들어보세요
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        FesMate 시작하기
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-8 mt-16">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            FesMate
                        </span>
                        {" - "}공연과 페스티벌의 모든 것
                    </p>
                </div>
            </footer>
        </div>
    );
}
