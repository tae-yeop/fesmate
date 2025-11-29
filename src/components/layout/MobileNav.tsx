"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Music, Ticket, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
    const pathname = usePathname();

    const items = [
        {
            title: "Home",
            href: "/",
            icon: Home,
        },
        {
            title: "Events",
            href: "/events/hub",
            icon: Music,
        },
        {
            title: "Transfer",
            href: "/companions",
            icon: Ticket,
        },
        {
            title: "Artists",
            href: "/artists",
            icon: Star,
        },
        {
            title: "My",
            href: "/my",
            icon: User,
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background md:hidden">
            <div className="grid h-16 grid-cols-5 items-center justify-items-center">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

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
        </div>
    );
}
