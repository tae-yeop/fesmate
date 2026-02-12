import { test, expect } from "@playwright/test";

test.describe("Smoke Tests - 빠른 전체 점검", () => {
    const pages = [
        { path: "/", name: "홈" },
        { path: "/explore", name: "탐색" },
        { path: "/community", name: "커뮤니티" },
        { path: "/myfes", name: "MyFes" },
        { path: "/fieldnote", name: "FieldNote" },
        { path: "/leaderboard", name: "리더보드" },
        { path: "/login", name: "로그인" },
        { path: "/notifications", name: "알림" },
        { path: "/profile", name: "프로필" },
        { path: "/event/e2", name: "행사 상세" },
        { path: "/crew/crew1", name: "크루 상세" },
        { path: "/user/user1", name: "사용자 프로필" },
        { path: "/fieldnote/call", name: "콜가이드 목록" },
        { path: "/guide", name: "가이드" },
    ];

    for (const { path, name } of pages) {
        test(`${name} 페이지 로드 (${path})`, async ({ page }) => {
            const response = await page.goto(path);
            
            expect(response?.status()).toBeLessThan(500);
            await expect(page.locator("body")).toBeVisible();
        });
    }
});

test.describe("Smoke Tests - 핵심 기능 점검", () => {
    test("네비게이션 링크 동작", async ({ page }) => {
        await page.goto("/");
        
        const navLinks = page.locator('nav a[href]');
        const count = await navLinks.count();
        
        expect(count).toBeGreaterThan(0);
    });

    test("JavaScript 오류 없음", async ({ page }) => {
        const errors: string[] = [];
        
        page.on("pageerror", (error) => {
            errors.push(error.message);
        });

        await page.goto("/");
        await page.goto("/explore");
        await page.goto("/community");
        
        expect(errors).toHaveLength(0);
    });

    test("콘솔 에러 없음 (Critical)", async ({ page }) => {
        const criticalErrors: string[] = [];
        
        page.on("console", (msg) => {
            if (msg.type() === "error" && !msg.text().includes("404")) {
                criticalErrors.push(msg.text());
            }
        });

        await page.goto("/");
        await page.waitForLoadState("networkidle");
        
        const hasCritical = criticalErrors.some(
            (e) => e.includes("TypeError") || e.includes("ReferenceError")
        );
        
        expect(hasCritical).toBe(false);
    });
});
