import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { DevProvider } from "@/lib/dev-context";
import { DevPanel, DevStatusBar } from "@/components/dev";
import { AuthProvider } from "@/lib/auth-context";
import { BlockProvider } from "@/lib/block-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { HelpfulProvider } from "@/lib/helpful-context";
import { CommentProvider } from "@/lib/comment-context";
import { MyTimetableProvider } from "@/lib/my-timetable-context";
import { BadgeProvider } from "@/lib/badge-context";
import { CrewProvider } from "@/lib/crew-context";
import { FollowProvider } from "@/lib/follow-context";
import { UserProfileProvider } from "@/lib/user-profile-context";
import { LeaderboardProvider } from "@/lib/leaderboard-context";
import { JoinProvider } from "@/lib/join-context";
import { CompanionProvider } from "@/lib/companion-context";
import { ParticipationProvider } from "@/lib/participation-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "FesMate - Festival Mate",
  description: "Your ultimate festival companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${inter.variable} ${notoSansKr.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <AuthProvider>
          <DevProvider>
            <BlockProvider>
              <WishlistProvider>
                <BadgeProvider>
                <CrewProvider>
                <FollowProvider>
                <UserProfileProvider>
                <HelpfulProvider>
                  <CommentProvider>
                    <MyTimetableProvider>
                      <LeaderboardProvider>
                      <JoinProvider>
                      <CompanionProvider>
                      <ParticipationProvider>
                      <DevStatusBar />
                      <div className="relative flex min-h-screen flex-col">
                        <Header />
                        <main className="flex-1 pb-16 md:pb-0">{children}</main>
                        <MobileNav />
                        <DevPanel />
                      </div>
                      </ParticipationProvider>
                      </CompanionProvider>
                      </JoinProvider>
                      </LeaderboardProvider>
                    </MyTimetableProvider>
                  </CommentProvider>
                </HelpfulProvider>
                </UserProfileProvider>
                </FollowProvider>
                </CrewProvider>
                </BadgeProvider>
              </WishlistProvider>
            </BlockProvider>
          </DevProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
