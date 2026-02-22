import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => "/",
}));

// Mock firebase
vi.mock("@/lib/firebase/client", () => ({
    auth: { onAuthStateChanged: vi.fn(), signOut: vi.fn() },
    db: {},
}));

vi.mock("firebase/auth", () => ({
    onAuthStateChanged: vi.fn((auth, cb) => { cb(null); return vi.fn(); }),
}));

vi.mock("firebase/firestore", () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
    doc: vi.fn(),
    getDoc: vi.fn(),
    onSnapshot: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    addDoc: vi.fn(),
    serverTimestamp: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    runTransaction: vi.fn(),
    documentId: vi.fn(),
    getFirestore: vi.fn(),
}));

vi.mock("firebase/app", () => ({
    initializeApp: vi.fn(),
    getApps: vi.fn(() => []),
}));

describe("ホームページ", () => {
    // Test 24
    it("ページモジュールが正しくインポートできること", async () => {
        const mod = await import("@/app/page");
        expect(mod.default).toBeDefined();
    });

    // Test 25
    it("ページがレンダリングできること", async () => {
        const { default: HomePage } = await import("@/app/page");
        const { container } = render(<HomePage />);
        expect(container).toBeDefined();
    });
});
