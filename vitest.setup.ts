import "@testing-library/dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// 환경 변수 mock (Supabase 등)
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

// Supabase client mock
vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        },
    })),
}));

// 각 테스트 후 cleanup
afterEach(() => {
    cleanup();
});

// localStorage mock
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
vi.stubGlobal("localStorage", localStorageMock);

// matchMedia mock (반응형 테스트용)
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// IntersectionObserver mock
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
});
vi.stubGlobal("IntersectionObserver", mockIntersectionObserver);

// ResizeObserver mock
vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})));
