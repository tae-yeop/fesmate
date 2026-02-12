import { test, expect } from "@playwright/test";

test.describe("알림 시스템", () => {
    test("알림 페이지 로드", async ({ page }) => {
        await page.goto("/notifications");
        expect(await page.title()).toBeTruthy();
        await expect(page.locator("body")).toBeVisible();
    });

    test("알림 목록 표시", async ({ page }) => {
        await page.goto("/notifications");
        
        // 알림 목록 또는 빈 상태 메시지가 표시되어야 함
        const hasNotifications = await page.locator('[class*="notification"], [class*="alert"]').count() > 0;
        const hasEmptyState = await page.getByText(/알림|없|로그인/).count() > 0;
        
        expect(hasNotifications || hasEmptyState).toBeTruthy();
    });
});
