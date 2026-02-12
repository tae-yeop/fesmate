import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : 4,
    timeout: 60000,
    reporter: [
        ["html", { outputFolder: "playwright-report" }],
        ["list"],
    ],
    use: {
        baseURL: "http://localhost:3010",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        navigationTimeout: 45000,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "Mobile Chrome",
            use: { ...devices["Pixel 5"] },
        },
    ],
    webServer: {
        command: isCI ? "npm run build && npm run start -- --port 3010" : "npm run dev -- --port 3010",
        url: "http://localhost:3010",
        reuseExistingServer: !isCI,
        timeout: 180000,
    },
});
