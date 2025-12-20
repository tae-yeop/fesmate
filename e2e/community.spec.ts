import { test, expect } from "@playwright/test";

test.describe("커뮤니티 페이지", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/community");
    });

    test("페이지가 로드되고 카테고리 탭이 표시됨", async ({ page }) => {
        // 페이지 제목 확인
        await expect(page.locator("h1")).toContainText("커뮤니티");

        // 카테고리 탭 확인
        await expect(page.getByRole("button", { name: /동행/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /택시/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /밥/i })).toBeVisible();
    });

    test("카테고리 탭 클릭 시 필터링됨", async ({ page }) => {
        // 동행 탭 클릭
        await page.getByRole("button", { name: /동행/i }).click();

        // URL 변경 확인 또는 탭 활성화 확인
        await expect(page.getByRole("button", { name: /동행/i })).toHaveClass(/border-primary/);
    });

    test("내 참여 버튼 클릭 시 모달 열림", async ({ page }) => {
        // "내 참여" 버튼 찾기
        const myParticipationButton = page.getByRole("button", { name: /내 참여/i });

        // 버튼이 있으면 클릭
        if (await myParticipationButton.isVisible()) {
            await myParticipationButton.click();

            // 모달 헤더 확인
            await expect(page.locator("text=내 참여")).toBeVisible();

            // 받은 신청/보낸 신청 탭 확인
            await expect(page.getByText("받은 신청")).toBeVisible();
            await expect(page.getByText("보낸 신청")).toBeVisible();
        }
    });

    test("글 작성 버튼이 표시됨", async ({ page }) => {
        // 글쓰기 버튼 확인 (+ 아이콘 또는 "글쓰기" 텍스트)
        const writeButton = page.locator('[aria-label="글쓰기"], button:has-text("글쓰기"), button:has(svg.lucide-plus)');
        await expect(writeButton.first()).toBeVisible();
    });
});

test.describe("참여 신청 플로우", () => {
    test("동행 글에서 참여 신청 버튼 클릭", async ({ page }) => {
        await page.goto("/community");

        // 동행 카테고리로 이동
        await page.getByRole("button", { name: /동행/i }).click();

        // 첫 번째 글의 참여하기 버튼 찾기
        const joinButton = page.locator("button:has-text('참여하기'), button:has-text('신청')").first();

        if (await joinButton.isVisible()) {
            await joinButton.click();

            // 참여 모달 또는 상태 변경 확인
            // 실제 UI에 따라 조정 필요
        }
    });
});
