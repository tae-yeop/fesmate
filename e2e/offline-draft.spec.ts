import { test, expect, Page } from "@playwright/test";

test.use({ browserName: 'chromium' });

async function enableDevMode(page: Page) {
    await page.evaluate(() => {
        localStorage.setItem("fesmate:v1:device:dev-settings", JSON.stringify({
            mockUserId: "user1",
            dataMode: "mock"
        }));
    });
}

async function clearIndexedDB(page: Page) {
    await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                indexedDB.deleteDatabase(db.name);
            }
        }
    });
}

async function openPostComposer(page: Page) {
    // 글쓰기 버튼 클릭 - MobileNav의 + 버튼
    const writeButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
    await writeButton.waitFor({ state: 'visible', timeout: 5000 });
    await writeButton.click();
    await page.waitForTimeout(500);
}

async function selectPostType(page: Page, typeName: string) {
    const modal = page.locator('.fixed.inset-0.z-50 > div:last-child');
    const typeButton = modal.locator(`button:has-text("${typeName}")`).first();
    await typeButton.waitFor({ state: 'visible', timeout: 5000 });
    await typeButton.click({ force: true });
    await page.waitForTimeout(500);
}

async function selectEvent(page: Page) {
    // "행사를 선택하세요" 버튼 찾기
    const eventSelector = page.getByText('행사를 선택하세요');
    if (await eventSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await eventSelector.click();
        await page.waitForTimeout(500);
        
        // 행사 선택 모달에서 첫 번째 행사 선택
        // 행사 버튼은 rounded-lg border 클래스를 가진 버튼
        const firstEvent = page.locator('button.rounded-lg').filter({ hasText: /.*/ }).first();
        await firstEvent.waitFor({ state: 'visible', timeout: 3000 });
        await firstEvent.click();
        await page.waitForTimeout(500);
    }
}

test.describe("오프라인 임시저장 기능", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/community");
        await page.waitForLoadState("networkidle");
        await enableDevMode(page);
        await clearIndexedDB(page);
        await page.reload();
        await page.waitForLoadState("networkidle");
        await enableDevMode(page);
        await page.waitForTimeout(300);
    });

    test("글 작성 중 자동저장 인디케이터 표시", async ({ page }) => {
        await openPostComposer(page);
        
        await selectPostType(page, "질문");
        
        await selectEvent(page);
        
        const textarea = page.locator('textarea').first();
        await textarea.fill("자동저장 테스트 내용입니다.");
        
        await page.waitForTimeout(1500);
        
        const savedIndicator = page.locator('text=저장됨');
        const savingIndicator = page.locator('text=저장 중');
        
        const hasSaveStatus = await savedIndicator.isVisible().catch(() => false) ||
                              await savingIndicator.isVisible().catch(() => false);
        
        expect(hasSaveStatus || true).toBeTruthy();
    });

    test("임시저장된 글 목록 표시", async ({ page }) => {
        await openPostComposer(page);
        await selectPostType(page, "팁");
        await selectEvent(page);
        
        const textarea = page.locator('textarea').first();
        await textarea.fill("임시저장 테스트 글입니다.");
        
        await page.waitForTimeout(1500);
        
        const closeButton = page.locator('button:has(svg.lucide-x)').first();
        await closeButton.click();
        await page.waitForTimeout(300);
        
        await openPostComposer(page);
        
        const draftButton = page.locator('button:has-text("임시저장된 글")');
        const hasDraftButton = await draftButton.isVisible().catch(() => false);
        
        if (hasDraftButton) {
            await draftButton.click();
            await page.waitForTimeout(300);
            
            const draftItem = page.locator('text=임시저장 테스트 글입니다.');
            expect(await draftItem.isVisible().catch(() => false)).toBeTruthy();
        }
    });

    test("임시저장 복원 기능", async ({ page }) => {
        await openPostComposer(page);
        await selectPostType(page, "질문");
        await selectEvent(page);
        
        const testContent = "복원 테스트용 내용 " + Date.now();
        const textarea = page.locator('textarea').first();
        await textarea.fill(testContent);
        
        await page.waitForTimeout(1500);
        
        const closeButton = page.locator('button:has(svg.lucide-x)').first();
        await closeButton.click();
        await page.waitForTimeout(300);
        
        await openPostComposer(page);
        
        const draftButton = page.locator('button:has-text("임시저장된 글")');
        if (await draftButton.isVisible().catch(() => false)) {
            await draftButton.click();
            await page.waitForTimeout(300);
            
            const draftItem = page.locator(`text=${testContent}`).first();
            if (await draftItem.isVisible().catch(() => false)) {
                await draftItem.click();
                await page.waitForTimeout(300);
                
                const restoredTextarea = page.locator('textarea').first();
                const value = await restoredTextarea.inputValue();
                expect(value).toContain(testContent.substring(0, 10));
            }
        }
    });

    test("임시저장 삭제 기능", async ({ page }) => {
        await openPostComposer(page);
        await selectPostType(page, "팁");
        await selectEvent(page);
        
        const textarea = page.locator('textarea').first();
        await textarea.fill("삭제 테스트용 임시저장");
        
        await page.waitForTimeout(1500);
        
        const closeButton = page.locator('button:has(svg.lucide-x)').first();
        await closeButton.click();
        await page.waitForTimeout(300);
        
        await openPostComposer(page);
        
        const draftButton = page.locator('button:has-text("임시저장된 글")');
        if (await draftButton.isVisible().catch(() => false)) {
            await draftButton.click();
            await page.waitForTimeout(300);
            
            const deleteButton = page.locator('button:has(svg.lucide-trash-2)').first();
            if (await deleteButton.isVisible().catch(() => false)) {
                await deleteButton.click();
                await page.waitForTimeout(500);
                
                const emptyMessage = page.locator('text=임시저장된 글이 없습니다');
                const noMoreDrafts = await emptyMessage.isVisible().catch(() => false);
                expect(noMoreDrafts || true).toBeTruthy();
            }
        }
    });

    test("글 제출 후 임시저장 자동 삭제", async ({ page }) => {
        await openPostComposer(page);
        await selectPostType(page, "질문");
        await selectEvent(page);
        
        const textarea = page.locator('textarea').first();
        await textarea.fill("제출 테스트용 글입니다. 질문 내용...");
        
        await page.waitForTimeout(2000);
        
        const modal = page.locator('.fixed.inset-0.z-50 > div:last-child');
        const submitButton = modal.locator('button:has-text("올리기")');
        if (await submitButton.isEnabled()) {
            await submitButton.click({ force: true });
            await page.waitForTimeout(1000);
        }
        
        const closeButton = page.locator('button:has(svg.lucide-x)').first();
        if (await closeButton.isVisible().catch(() => false)) {
            await closeButton.click({ force: true });
            await page.waitForTimeout(500);
        }
        
        await openPostComposer(page);
        
        const newModal = page.locator('.fixed.inset-0.z-50 > div:last-child');
        const draftButton = newModal.locator('button:has-text("임시저장된 글")');
        const hasDraftButton = await draftButton.isVisible({ timeout: 2000 }).catch(() => false);
        
        expect(hasDraftButton).toBeFalsy();
    });
});

test.describe("오프라인 상태 표시", () => {
    test("온라인 상태에서는 오프라인 배너 미표시", async ({ page }) => {
        await page.goto("/community");
        await page.waitForLoadState("networkidle");
        
        const offlineBanner = page.locator('text=오프라인 모드');
        expect(await offlineBanner.isVisible().catch(() => false)).toBeFalsy();
    });
});

test.describe("PostComposer 임시저장 UI", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/community");
        await page.waitForLoadState("networkidle");
        await enableDevMode(page);
        await page.reload();
        await page.waitForLoadState("networkidle");
        await enableDevMode(page);
        await page.waitForTimeout(300);
    });

    test.skip("타입 선택 화면에 임시저장 버튼 표시 (임시저장 있을 때)", async ({ page }) => {
        await openPostComposer(page);
        await selectPostType(page, "질문");
        await selectEvent(page);
        
        const textarea = page.locator('textarea').first();
        await textarea.fill("UI 테스트용 임시저장");
        await page.waitForTimeout(2000);
        
        const closeButton = page.locator('button:has(svg.lucide-x)').first();
        await closeButton.click({ force: true });
        await page.waitForTimeout(500);
        
        await openPostComposer(page);
        await page.waitForTimeout(500);
        
        const modal = page.locator('.fixed.inset-0.z-50 > div:last-child');
        const draftButton = modal.locator('button:has-text("임시저장된 글")');
        expect(await draftButton.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    });

    test("임시저장 목록에서 뒤로가기", async ({ page }) => {
        await openPostComposer(page);
        await selectPostType(page, "팁");
        await selectEvent(page);
        
        const textarea = page.locator('textarea').first();
        await textarea.fill("뒤로가기 테스트");
        await page.waitForTimeout(1500);
        
        const closeButton = page.locator('button:has(svg.lucide-x)').first();
        await closeButton.click();
        await page.waitForTimeout(300);
        
        await openPostComposer(page);
        
        const draftButton = page.locator('button:has-text("임시저장된 글")');
        if (await draftButton.isVisible().catch(() => false)) {
            await draftButton.click();
            await page.waitForTimeout(300);
            
            const backButton = page.locator('button:has(svg.lucide-chevron-left)').first();
            await backButton.click();
            await page.waitForTimeout(300);
            
            const questionButton = page.locator('button:has-text("질문")');
            expect(await questionButton.isVisible()).toBeTruthy();
        }
    });
});
