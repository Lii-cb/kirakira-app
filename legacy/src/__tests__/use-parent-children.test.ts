import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

// Mock firebase modules
vi.mock("@/lib/firebase/client", () => ({
    auth: { onAuthStateChanged: vi.fn() },
    db: {},
}));

vi.mock("firebase/auth", () => ({
    onAuthStateChanged: vi.fn((auth, cb) => {
        // Simulate no user
        cb(null);
        return vi.fn(); // unsubscribe
    }),
}));

vi.mock("firebase/firestore", () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
    doc: vi.fn(),
    getDoc: vi.fn(),
}));

vi.mock("firebase/app", () => ({
    initializeApp: vi.fn(),
    getApps: vi.fn(() => []),
}));

import { useParentChildren } from "@/hooks/use-parent-children";

describe("useParentChildren フック", () => {
    // Test 21
    it("初期状態で loading が true であること", () => {
        const { result } = renderHook(() => useParentChildren());
        expect(result.current.loading).toBe(true);
    });

    // Test 22
    it("初期状態で childrenData が空配列であること", () => {
        const { result } = renderHook(() => useParentChildren());
        expect(result.current.childrenData).toEqual([]);
    });

    // Test 23
    it("未認証時にログインページへリダイレクトされること", async () => {
        renderHook(() => useParentChildren());
        // onAuthStateChanged callback fires with null user
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(mockPush).toHaveBeenCalledWith("/parent/login");
    });
});
