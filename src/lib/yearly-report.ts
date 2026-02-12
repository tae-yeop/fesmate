export interface YearlyReportData {
    year: number;
    userId: string;
    totalEvents: number;
    totalArtists: number;
    totalVenues: number;
    totalDays: number;
    topArtists: { name: string; count: number; imageUrl?: string }[];
    topVenues: { name: string; count: number; address: string }[];
    topGenres: { genre: string; count: number }[];
    firstEvent: { name: string; date: Date; venue: string } | null;
    lastEvent: { name: string; date: Date; venue: string } | null;
    busiestMonth: { month: number; count: number };
    longestStreak: number;
    lateNightShows: number;
    earlyBirdShows: number;
    festivalDays: number;
    companionsCount: number;
    postsWritten: number;
    photosShared: number;
    helpfulReactions: number;
    badges: string[];
    generatedAt: Date;
}

export interface ReportSlide {
    id: string;
    type: "intro" | "stat" | "top-list" | "timeline" | "achievement" | "outro";
    title: string;
    subtitle?: string;
    data: Record<string, unknown>;
    backgroundColor: string;
    animation: "fade" | "slide" | "zoom";
}

export interface UserYearData {
    attendedEvents: Array<{
        id: string;
        name: string;
        date: Date;
        venue: string;
        venueAddress: string;
        artists: string[];
        genre: string;
        isFestival: boolean;
    }>;
    posts: number;
    photos: number;
    helpfulGiven: number;
    companions: string[];
    badges: string[];
}

const GRADIENT_COLORS = [
    ["#4c1d95", "#be185d"],
    ["#1e3a5f", "#0f172a"],
    ["#f97316", "#ec4899"],
    ["#06b6d4", "#3b82f6"],
    ["#22c55e", "#14b8a6"],
    ["#7c3aed", "#2563eb"],
];

function getRandomGradient(): string {
    const colors = GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

export function generateYearlyReport(
    userId: string,
    year: number,
    userData: UserYearData
): YearlyReportData {
    const events = userData.attendedEvents;

    const artistCounts: Record<string, number> = {};
    const venueCounts: Record<string, { count: number; address: string }> = {};
    const genreCounts: Record<string, number> = {};
    const monthCounts: Record<number, number> = {};
    const uniqueDates = new Set<string>();
    const uniqueArtists = new Set<string>();
    const uniqueVenues = new Set<string>();

    let lateNightShows = 0;
    let earlyBirdShows = 0;
    let festivalDays = 0;

    events.forEach(event => {
        const date = new Date(event.date);
        const dateKey = date.toISOString().split("T")[0];
        const month = date.getMonth() + 1;
        const hour = date.getHours();

        uniqueDates.add(dateKey);
        uniqueVenues.add(event.venue);

        monthCounts[month] = (monthCounts[month] || 0) + 1;

        if (!venueCounts[event.venue]) {
            venueCounts[event.venue] = { count: 0, address: event.venueAddress };
        }
        venueCounts[event.venue].count++;

        genreCounts[event.genre] = (genreCounts[event.genre] || 0) + 1;

        event.artists.forEach(artist => {
            uniqueArtists.add(artist);
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });

        if (hour >= 22 || hour < 2) lateNightShows++;
        if (hour < 12 && hour >= 6) earlyBirdShows++;
        if (event.isFestival) festivalDays++;
    });

    const sortedArtists = Object.entries(artistCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    const sortedVenues = Object.entries(venueCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([name, { count, address }]) => ({ name, count, address }));

    const sortedGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([genre, count]) => ({ genre, count }));

    const busiestMonth = Object.entries(monthCounts)
        .sort(([, a], [, b]) => b - a)[0];

    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let longestStreak = 0;
    let currentStreak = 1;
    const sortedDates = Array.from(uniqueDates).sort();

    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor(
            (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
            currentStreak++;
        } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
        }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
        year,
        userId,
        totalEvents: events.length,
        totalArtists: uniqueArtists.size,
        totalVenues: uniqueVenues.size,
        totalDays: uniqueDates.size,
        topArtists: sortedArtists,
        topVenues: sortedVenues,
        topGenres: sortedGenres,
        firstEvent: sortedEvents[0]
            ? {
                  name: sortedEvents[0].name,
                  date: new Date(sortedEvents[0].date),
                  venue: sortedEvents[0].venue,
              }
            : null,
        lastEvent: sortedEvents[sortedEvents.length - 1]
            ? {
                  name: sortedEvents[sortedEvents.length - 1].name,
                  date: new Date(sortedEvents[sortedEvents.length - 1].date),
                  venue: sortedEvents[sortedEvents.length - 1].venue,
              }
            : null,
        busiestMonth: busiestMonth
            ? { month: parseInt(busiestMonth[0]), count: busiestMonth[1] }
            : { month: 1, count: 0 },
        longestStreak,
        lateNightShows,
        earlyBirdShows,
        festivalDays,
        companionsCount: userData.companions.length,
        postsWritten: userData.posts,
        photosShared: userData.photos,
        helpfulReactions: userData.helpfulGiven,
        badges: userData.badges,
        generatedAt: new Date(),
    };
}

export function getReportSlides(data: YearlyReportData): ReportSlide[] {
    const slides: ReportSlide[] = [];

    slides.push({
        id: "intro",
        type: "intro",
        title: `${data.year}년의 공연 여정`,
        subtitle: "당신의 한 해를 돌아봅니다",
        data: { year: data.year },
        backgroundColor: getRandomGradient(),
        animation: "fade",
    });

    slides.push({
        id: "total-stats",
        type: "stat",
        title: "올해의 기록",
        data: {
            stats: [
                { label: "공연", value: data.totalEvents, unit: "회" },
                { label: "아티스트", value: data.totalArtists, unit: "팀" },
                { label: "공연장", value: data.totalVenues, unit: "곳" },
                { label: "공연 날", value: data.totalDays, unit: "일" },
            ],
        },
        backgroundColor: getRandomGradient(),
        animation: "slide",
    });

    if (data.topArtists.length > 0) {
        slides.push({
            id: "top-artists",
            type: "top-list",
            title: "가장 많이 본 아티스트",
            data: {
                items: data.topArtists,
                type: "artist",
            },
            backgroundColor: getRandomGradient(),
            animation: "zoom",
        });
    }

    if (data.topVenues.length > 0) {
        slides.push({
            id: "top-venues",
            type: "top-list",
            title: "자주 찾은 공연장",
            data: {
                items: data.topVenues,
                type: "venue",
            },
            backgroundColor: getRandomGradient(),
            animation: "slide",
        });
    }

    if (data.firstEvent && data.lastEvent) {
        slides.push({
            id: "timeline",
            type: "timeline",
            title: "올해의 첫 공연과 마지막 공연",
            data: {
                first: data.firstEvent,
                last: data.lastEvent,
            },
            backgroundColor: getRandomGradient(),
            animation: "fade",
        });
    }

    slides.push({
        id: "fun-facts",
        type: "stat",
        title: "재미있는 사실들",
        subtitle: "알고 계셨나요?",
        data: {
            facts: [
                data.longestStreak > 1 && {
                    icon: "🔥",
                    text: `최대 ${data.longestStreak}일 연속 공연!`,
                },
                data.lateNightShows > 0 && {
                    icon: "🌙",
                    text: `${data.lateNightShows}번의 심야 공연`,
                },
                data.festivalDays > 0 && {
                    icon: "🎪",
                    text: `${data.festivalDays}일간의 페스티벌`,
                },
                { icon: "📅", text: `가장 바빴던 달: ${data.busiestMonth.month}월` },
            ].filter(Boolean),
        },
        backgroundColor: getRandomGradient(),
        animation: "zoom",
    });

    if (data.badges.length > 0) {
        slides.push({
            id: "achievements",
            type: "achievement",
            title: "획득한 배지",
            data: {
                badges: data.badges,
                count: data.badges.length,
            },
            backgroundColor: getRandomGradient(),
            animation: "fade",
        });
    }

    slides.push({
        id: "outro",
        type: "outro",
        title: `${data.year + 1}년에도 함께해요!`,
        subtitle: "더 많은 공연에서 만나요",
        data: {
            totalEvents: data.totalEvents,
            message: data.totalEvents > 20
                ? "진정한 공연 마니아시네요!"
                : data.totalEvents > 10
                ? "활발한 공연 생활이네요!"
                : "앞으로 더 많은 공연이 기다리고 있어요!",
        },
        backgroundColor: getRandomGradient(),
        animation: "fade",
    });

    return slides;
}

export function generateMockReportData(userId: string, year: number): YearlyReportData {
    const mockUserData: UserYearData = {
        attendedEvents: [
            {
                id: "1",
                name: "서울 재즈 페스티벌",
                date: new Date(`${year}-05-25`),
                venue: "올림픽공원",
                venueAddress: "서울 송파구",
                artists: ["재즈 밴드 A", "재즈 밴드 B"],
                genre: "jazz",
                isFestival: true,
            },
            {
                id: "2",
                name: "인디밴드 콘서트",
                date: new Date(`${year}-06-10`),
                venue: "홍대 롤링홀",
                venueAddress: "서울 마포구",
                artists: ["잔나비"],
                genre: "indie",
                isFestival: false,
            },
            {
                id: "3",
                name: "펜타포트 록 페스티벌",
                date: new Date(`${year}-08-05`),
                venue: "송도 달빛축제공원",
                venueAddress: "인천 연수구",
                artists: ["록 밴드 A", "록 밴드 B", "록 밴드 C"],
                genre: "rock",
                isFestival: true,
            },
            {
                id: "4",
                name: "펜타포트 록 페스티벌",
                date: new Date(`${year}-08-06`),
                venue: "송도 달빛축제공원",
                venueAddress: "인천 연수구",
                artists: ["록 밴드 D", "록 밴드 E"],
                genre: "rock",
                isFestival: true,
            },
            {
                id: "5",
                name: "잔나비 단독 콘서트",
                date: new Date(`${year}-10-20`),
                venue: "올림픽홀",
                venueAddress: "서울 송파구",
                artists: ["잔나비"],
                genre: "indie",
                isFestival: false,
            },
            {
                id: "6",
                name: "연말 콘서트",
                date: new Date(`${year}-12-31T23:00:00`),
                venue: "예스24 라이브홀",
                venueAddress: "서울 광진구",
                artists: ["실리카겔"],
                genre: "rock",
                isFestival: false,
            },
        ],
        posts: 15,
        photos: 42,
        helpfulGiven: 28,
        companions: ["user2", "user3"],
        badges: ["early-bird", "festival-goer", "night-owl"],
    };

    return generateYearlyReport(userId, year, mockUserData);
}
