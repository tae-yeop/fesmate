"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Users, CalendarHeart, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 하단 모바일 네비게이션 - 5탭 구조
 * 1. 홈
 * 2. 탐색(행사)
 * 3. FieldNote (콜가이드/셋리스트/아티스트)
 * 4. 커뮤니티
 * 5. MyFes
 */
export function MobileNav() {
    const pathname = usePathname();

    const items = [
        {
            title: "홈",
            href: "/",
            icon: Home,
        },
        {
            title: "탐색",
            href: "/explore",
            icon: Search,
        },
        {
            title: "노트",
            href: "/fieldnote",
            icon: NotebookPen,
        },
        {
            title: "커뮤니티",
            href: "/community",
            icon: Users,
        },
        {
            title: "MyFes",
            href: "/myfes",
            icon: CalendarHeart,
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 z-50 w-full border-t bg-background md:hidden">
            <div className="grid h-16 grid-cols-5 items-center justify-items-center">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors hover:text-primary",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
