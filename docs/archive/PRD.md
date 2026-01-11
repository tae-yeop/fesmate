# Product Requirements Document (PRD) - FesMate

## 1. Product Overview
**Product Name:** FesMate (Festival Mate)
**Tagline:** Your Ultimate Festival & Concert Companion / 팬 경험을 완성하는 페스티벌 OS

**Vision:**
To integrate scattered information and services for cultural activities (concerts, festivals, exhibitions) into a single platform. FesMate aims to be the "OS for Fan Experience," covering everything from discovery and planning to on-site enjoyment and post-event archiving.

**Core Value Proposition:**
- **Information Hub:** Aggregated details, timetables, and artist info in one place.
- **Real-time Utility:** Live reporting on queues, inventory, and facilities.
- **Community:** Safe companion finding and ticket transfer.
- **Archiving:** Personalized logs (GongLog), ticket books, and stats.

## 2. Target Audience (Personas)
1.  **The Heavy Fan / Festival-goer:** Needs fast access to timetables, setlists, and real-time on-site updates (queues, merchandise).
2.  **The Beginner:** Needs guidance, recommendations, and tips for their first concert/festival.
3.  **The Safety Seeker:** Wants secure ways to find companions (taxi, accommodation) and transfer tickets without fraud.
4.  **The Organizer:** (Future B2B) Wants to communicate updates and manage crowd flow effectively.

## 3. Key Features & Requirements

### 3.1 Event Information (The Hub)
-   **Event Hub Main:** Dashboard-style overview of "Live Now," "Upcoming," and "Recommended" events.
-   **Event Detail:** Comprehensive info including date, venue, lineup, and pricing.
-   **Smart Timetable:** Personalized customization, "Check" feature for notifications, and ICS export.
-   **Artist Page:** Profiles, setlists (interactive), and "Call & Response" guides.

### 3.2 Community & Safety
-   **Companion Finding:** Structured forms for Taxi, Meal, Accommodation, and Ticket sharing.
-   **Ticket Transfer:** Safe environment for P2P transfers with trust scores.
-   **Reviews:** Detailed post-event reviews with verification (ticket auth).
-   **User Reporting:** Live updates on "Queue Times," "MD Sold Out," etc., with voting/reliability scores.

### 3.3 Personalization (My Log)
-   **GongLog:** Timeline of attended events.
-   **Ticket Book:** AI-assisted scanning and digital archiving of physical tickets.
-   **Statistics:** "My Year in Concerts," genre preference analysis.
-   **Gamification:** Badges for achievements (e.g., "Attended 5 Rock Festivals").

### 3.4 Core Tech & Security
-   **Auth:** Social Login (Kakao, Naver, Google) + Mobile verification.
-   **Real-time:** WebSocket/Supabase Realtime for live reports.
-   **Search:** Integrated search for events and artists.

## 4. User Experience (UX) Structure

### Navigation
-   **Desktop:** Top Menu (Main | Event Hub | Transfer | Artist | My Log)
-   **Mobile:** Bottom Tab Bar (Home | Events | Transfer | Artist | My)

### Key Flows
1.  **Discovery:** Landing Page -> Search/Filter -> Event Detail.
2.  **On-Site:** Event Detail -> Smart Timetable -> Live Report -> Notifications.
3.  **Community:** Event Detail -> Companion Board -> Write/Join.
4.  **Archiving:** My Page -> Write GongLog -> Share.

## 5. Technical Stack
-   **Frontend:** Next.js 15+ (App Router), TypeScript, Tailwind CSS v4.
-   **Backend/DB:** Supabase (PostgreSQL, Auth, Realtime, Storage).
-   **Infrastructure:** Vercel (Hosting), GitHub Actions (CI/CD).
-   **Design:** Mobile-First, Premium Dark/Light Mode.

## 6. Roadmap & Status
*Current Status: Phase 0 Completed, Phase 2 (UI) in Progress.*

| Phase | Feature Set | Status |
| :--- | :--- | :--- |
| **Phase 0** | **Project Setup & Design System** | ✅ Completed |
| **Phase 1** | **Authentication (Social Login)** | 🚧 Planned (Next Step) |
| **Phase 2** | **Event Info (Hub & Detail UI)** | 🟦 In Progress (UI Done) |
| **Phase 3** | **Search Functionality** | ⬜ Pending |
| **Phase 4** | **User Reporting System** | ⬜ Pending |
| **Phase 5-6** | **Notifications & On-Site Reports** | ⬜ Pending |
| **Phase 7** | **Smart Timetable** | ⬜ Pending |
| **Phase 8-10**| **Artist, Companion, Reviews** | ⬜ Pending |
| **Phase 11+**| **Archiving & Gamification** | ⬜ Pending |

## 7. Success Metrics
-   **Retention:** Daily Active Users (DAU) during festival seasons.
-   **Engagement:** Number of "Checks" on timetables, number of Reports posted.
-   **Growth:** User acquisition via social sharing (Ticket Books, Year-End Reports).
