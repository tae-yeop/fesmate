"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, User, Home, Users, CalendarHeart, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";
import { useUserProfile } from "@/lib/user-profile-context";
import { useState } from "react";
import { getUnreadNotificationCount } from "@/lib/mock-data";

/**
 * 헤더 컴포넌트 - PRD v0.5 기준
 * 모바일: 로고 + 검색 + 알림 + 프로필
 * 데스크톱: 로고 + 4탭 네비게이션 + 검색 + 알림 + 프로필
 */
export function Header() {
    const pathname = usePathname();
    const { user, isLoading, signOut } = useAuth();
    const { isDevMode } = useDevContext();
    const { myProfile, isLoggedIn } = useUserProfile();
    const [showMenu, setShowMenu] = useState(false);

    // 읽지 않은 알림 수 (실제로는 user?.id 사용)
    const unreadCount = getUnreadNotificationCount();

    const navItems = [
        { title: "홈", href: "/", icon: Home },
        { title: "탐색", href: "/explore", icon: Search },
        { title: "커뮤니티", href: "/community", icon: Users },
        { title: "MyFes", href: "/myfes", icon: CalendarHeart },
    ];

    const handleSignOut = async () => {
        await signOut();
        setShowMenu(false);
    };

    return (
        <header className={cn(
            "sticky z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            isDevMode ? "top-6" : "top-0"
        )}>
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
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </Link>

                    {/* 프로필/로그인 */}
                    {isLoading ? (
                        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                    ) : user ? (
                        // OAuth 로그인 사용자
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors"
                                aria-label="프로필 메뉴"
                            >
                                {user.user_metadata?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="프로필"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                        {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                            </button>

                            {/* 드롭다운 메뉴 */}
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border bg-card shadow-lg py-1">
                                        <div className="px-3 py-2 border-b">
                                            <p className="text-sm font-medium truncate">
                                                {user.user_metadata?.name || user.user_metadata?.full_name || "사용자"}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <Link
                                            href="/profile"
                                            onClick={() => setShowMenu(false)}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                        >
                                            <Settings className="h-4 w-4" />
                                            내 프로필
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            로그아웃
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : isLoggedIn && myProfile ? (
                        // Dev 모드 로그인 사용자
                        <Link
                            href="/profile"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 text-xl border border-primary/20 hover:border-primary/40 transition-colors"
                            aria-label="프로필"
                        >
                            {myProfile.avatar}
                        </Link>
                    ) : (
                        // 비로그인 상태
                        <Link
                            href="/profile"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label="프로필"
                        >
                            <User className="h-5 w-5" />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
