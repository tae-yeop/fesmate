/**
 * Main Seed Script
 *
 * 모든 시드 데이터를 순서대로 삽입합니다.
 * 외래키 의존성에 따라 순서가 중요합니다:
 * 1. venues (장소)
 * 2. artists (아티스트)
 * 3. events (행사) + stages + event_artists + operational_slots
 *
 * 사용법:
 *   npm run seed
 *   npm run seed:venues
 *   npm run seed:artists
 *   npm run seed:events
 */

import { seedVenues } from "./venues";
import { seedArtists } from "./artists";
import { seedEvents } from "./events";

async function main() {
    console.log("🌱 Starting database seeding...\n");

    try {
        // 1. Venues 먼저 (외래키 없음)
        await seedVenues();
        console.log("");

        // 2. Artists (외래키 없음)
        await seedArtists();
        console.log("");

        // 3. Events + 관계 테이블 (venues, artists 참조)
        await seedEvents();
        console.log("");

        console.log("🎉 All seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

main();
