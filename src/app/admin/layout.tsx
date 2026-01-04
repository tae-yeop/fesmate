"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AdminLayoutProps {
    children: React.ReactNode;
}

/**
 * Admin 레이아웃
 * - 관리자 권한 확인
 * - 공통 네비게이션
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    async function checkAdminAccess() {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login?redirect=/admin");
                return;
            }

            // 개발 환경에서는 모든 사용자를 admin으로 처리
            if (process.env.NODE_ENV === "development") {
                setIsAdmin(true);
                setIsLoading(false);
                return;
            }

            // 프로덕션에서는 user_metadata.role 확인
            const isUserAdmin = user.user_metadata?.role === "admin";
            if (!isUserAdmin) {
                router.push("/");
                return;
            }

            setIsAdmin(true);
        } catch (error) {
            console.error("[AdminLayout] Error checking admin access:", error);
            router.push("/");
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Admin Header */}
            <header className="border-b bg-card sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Admin</span>
                        </div>
                    </div>
                    <nav className="flex items-center gap-4 overflow-x-auto">
                        <Link
                            href="/admin"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            대시보드
                        </Link>
                        <Link
                            href="/admin/reports"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            신고
                        </Link>
                        <Link
                            href="/admin/events"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            행사
                        </Link>
                        <Link
                            href="/admin/users"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            사용자
                        </Link>
                        <Link
                            href="/admin/content"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            콘텐츠
                        </Link>
                        <Link
                            href="/admin/audit"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            감사로그
                        </Link>
                        <Link
                            href="/admin/crawl"
                            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                            크롤링
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
}
