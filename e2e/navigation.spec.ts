import { test, expect } from "@playwright/test";

test.describe("메인 네비게이션", () => {
    test("홈페이지 로드", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/FesMate/i);
    });

    test("4탭 네비게이션 동작", async ({ page }) => {
        await page.goto("/");

        // 탐색 탭
        await page.getByRole("link", { name: /탐색/i }).click();
        await expect(page).toHaveURL(/\/explore/);

        // 커뮤니티 탭
        await page.getByRole("link", { name: /커뮤니티/i }).click();
        await expect(page).toHaveURL(/\/community/);

        // MyFes 탭
        await page.getByRole("link", { name: /MyFes/i }).click();
        await expect(page).toHaveURL(/\/myfes/);

        // 홈 탭
        await page.getByRole("link", { name: /홈/i }).click();
        await expect(page).toHaveURL("/");
    });
});

test.describe("이벤트 상세 페이지", () => {
    test("이벤트 페이지 로드 및 탭 동작", async ({ page }) => {
        // 시나리오 B (LIVE 모드)
        await page.goto("/event/e2");

        // 탭 확인
        await expect(page.getByRole("tab", { name: /개요/i })).toBeVisible();
        await expect(page.getByRole("tab", { name: /허브/i })).toBeVisible();

        // 허브 탭 클릭
        await page.getByRole("tab", { name: /허브/i }).click();
        await expect(page).toHaveURL(/tab=hub/);
    });

    test("찜 버튼 토글", async ({ page }) => {
        await page.goto("/event/e2");

        // 찜 버튼 찾기
        const wishlistButton = page.locator('[aria-label*="찜"], button:has(svg.lucide-star)').first();

        if (await wishlistButton.isVisible()) {
            // 초기 상태 확인 후 클릭
            await wishlistButton.click();

            // 상태 변경 확인 (fill 속성 또는 클래스 변경)
            // 실제 구현에 따라 조정
        }
    });
});
