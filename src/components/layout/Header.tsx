import Link from "next/link";
import { Search, Bell, User } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4">
                {/* Logo */}
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                        FesMate
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    <Link href="/events/hub" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Event Hub
                    </Link>
                    <Link href="/companions" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Transfer
                    </Link>
                    <Link href="/artists" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Artists
                    </Link>
                </nav>

                {/* Search & Actions */}
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <div className="w-full max-w-sm flex-1 md:w-auto md:flex-none">
                        <button className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full justify-start text-muted-foreground md:w-64 lg:w-80">
                            <Search className="mr-2 h-4 w-4" />
                            <span>Search events...</span>
                        </button>
                    </div>

                    <nav className="flex items-center space-x-2">
                        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                            <Bell className="h-5 w-5" />
                            <span className="sr-only">Notifications</span>
                        </button>
                        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                            <User className="h-5 w-5" />
                            <span className="sr-only">Profile</span>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
