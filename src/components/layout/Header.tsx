"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, User, Home, Users, CalendarHeart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 헤더 컴포넌트 - PRD v0.5 기준
 * 모바일: 로고 + 검색 + 알림 + 프로필
 * 데스크톱: 로고 + 4탭 네비게이션 + 검색 + 알림 + 프로필
 */
export function Header() {
    const pathname = usePathname();

    const navItems = [
        { title: "홈", href: "/", icon: Home },
        { title: "탐색", href: "/explore", icon: Search },
        { title: "커뮤니티", href: "/community", icon: Users },
        { title: "MyFes", href: "/myfes", icon: CalendarHeart },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
                {/* 로고 */}
                <Link href="/" className="flex items-center space-x-2">
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                        FesMate
                    </span>
                </Link>

                {/* 데스크톱 네비게이션 */}
                <nav className="hidden md:flex items-center space-x-6">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                {/* 우측 액션 버튼 */}
                <div className="flex items-center space-x-3">
                    {/* 통합 검색 */}
                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="검색"
                    >
                        <Search className="h-5 w-5" />
                    </button>

                    {/* 알림함 */}
                    <Link
                        href="/notifications"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors relative"
                        aria-label="알림"
                    >
                        <Bell className="h-5 w-5" />
                        {/* 안읽은 알림 표시 (추후 조건부 렌더링) */}
                        {/* <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" /> */}
                    </Link>

                    {/* 프로필/로그인 */}
                    <Link
                        href="/login"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="프로필"
                    >
                        <User className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </header>
    );
}
