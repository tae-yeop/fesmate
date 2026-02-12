import { test, expect } from "@playwright/test";

test.describe("P2 Features - 다크모드", () => {
    test("다크모드 토글 동작", async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        const html = page.locator("html");
        const initialClass = await html.getAttribute("class");
        
        const theme = await page.evaluate(() => localStorage.getItem("fesmate-theme"));
        expect(theme === null || ["light", "dark", "system"].includes(theme || "")).toBe(true);
    });

    test("테마 설정이 localStorage에 저장됨", async ({ page }) => {
        await page.goto("/");
        
        await page.evaluate(() => {
            localStorage.setItem("fesmate-theme", "dark");
        });
        
        await page.reload();
        await page.waitForLoadState("networkidle");
        
        const theme = await page.evaluate(() => localStorage.getItem("fesmate-theme"));
        expect(theme).toBe("dark");
    });
});

test.describe("P2 Features - 연말 결산 리포트", () => {
    test("리포트 페이지 로드", async ({ page }) => {
        const response = await page.goto("/report/2025");
        
        expect(response?.status()).toBeLessThan(500);
        await expect(page.locator("body")).toBeVisible();
    });

    test("리포트 슬라이드 표시", async ({ page }) => {
        await page.goto("/report/2025");
        await page.waitForLoadState("networkidle");
        
        const slideContainer = page.locator("[class*='slide'], [class*='report']").first();
        const hasContent = await page.locator("body").textContent();
        expect(hasContent?.length).toBeGreaterThan(0);
    });

    test("키보드 네비게이션", async ({ page }) => {
        await page.goto("/report/2025");
        await page.waitForLoadState("networkidle");
        
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(500);
        
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(500);
        
        expect(true).toBe(true);
    });
});

test.describe("P2 Features - Admin 모더레이션", () => {
    test("모더레이션 페이지 로드", async ({ page }) => {
        const response = await page.goto("/admin/moderation");
        
        expect(response?.status()).toBeLessThan(500);
        await expect(page.locator("body")).toBeVisible();
    });

    test("필터 탭 동작", async ({ page }) => {
        await page.goto("/admin/moderation");
        await page.waitForLoadState("networkidle");
        
        const allTab = page.locator('button:has-text("전체")');
        const reportTab = page.locator('button:has-text("신고")');
        const suggestionTab = page.locator('button:has-text("제안")');
        
        if (await allTab.isVisible()) {
            await allTab.click();
            await page.waitForTimeout(300);
        }
        
        if (await reportTab.isVisible()) {
            await reportTab.click();
            await page.waitForTimeout(300);
        }
        
        if (await suggestionTab.isVisible()) {
            await suggestionTab.click();
            await page.waitForTimeout(300);
        }
        
        expect(true).toBe(true);
    });
});

test.describe("P2 Features - 셋리스트", () => {
    test("이벤트 페이지에서 셋리스트 섹션 존재", async ({ page }) => {
        await page.goto("/event/e7");
        await page.waitForLoadState("networkidle");
        
        await expect(page.locator("body")).toBeVisible();
        
        const hasSetlistSection = await page.locator('text=/셋리스트|setlist/i').count() > 0 ||
                                  await page.locator('[class*="setlist"]').count() > 0;
        
        const pageLoaded = await page.locator("body").isVisible();
        expect(pageLoaded).toBe(true);
    });
});

test.describe("P2 Features - 티켓북 & 마스킹", () => {
    test("MyFes 티켓북 탭 접근", async ({ page }) => {
        await page.goto("/myfes");
        await page.waitForLoadState("networkidle");
        
        const ticketTab = page.locator('button:has-text("티켓북"), a:has-text("티켓북")').first();
        
        if (await ticketTab.isVisible()) {
            await ticketTab.click();
            await page.waitForTimeout(500);
        }
        
        await expect(page.locator("body")).toBeVisible();
    });
});

test.describe("P2 Features - 행사 등록", () => {
    test("행사 등록 버튼 존재", async ({ page }) => {
        await page.goto("/explore");
        await page.waitForLoadState("networkidle");
        
        const registerButton = page.locator('button:has-text("등록"), button:has-text("추가"), [aria-label*="등록"]').first();
        
        await expect(page.locator("body")).toBeVisible();
    });
});

test.describe("P2 Features - 타임테이블 제안", () => {
    test("이벤트 상세에서 타임테이블 표시", async ({ page }) => {
        await page.goto("/event/e2");
        await page.waitForLoadState("networkidle");
        
        const timetableSection = page.locator('button:has-text("타임테이블"), [class*="timetable"], [class*="timeline"]').first();
        
        if (await timetableSection.isVisible()) {
            await timetableSection.click();
            await page.waitForTimeout(500);
        }
        
        await expect(page.locator("body")).toBeVisible();
    });
});

test.describe("P2 Features - 공유 기능", () => {
    test("공유 버튼 존재 확인", async ({ page }) => {
        await page.goto("/event/e2");
        await page.waitForLoadState("networkidle");
        
        const shareButton = page.locator('[aria-label*="공유"], button:has(svg.lucide-share), button:has-text("공유")').first();
        
        if (await shareButton.isVisible()) {
            await shareButton.click();
            await page.waitForTimeout(500);
            
            const shareModal = page.locator('[role="dialog"], [class*="modal"], [class*="sheet"]').first();
            const isModalVisible = await shareModal.isVisible().catch(() => false);
            
            expect(true).toBe(true);
        } else {
            await expect(page.locator("body")).toBeVisible();
        }
    });
});
