import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
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

describe("保護者ログインページ", () => {
    // Test 26
    it("ログインボタンが表示されること", async () => {
        const { default: LoginPage } = await import("@/app/parent/login/page");
        render(<LoginPage />);
        expect(screen.getByText("Googleでログイン")).toBeInTheDocument();
    });

    // Test 27
    it("Ver 7.3 が表示されること", async () => {
        const { default: LoginPage } = await import("@/app/parent/login/page");
        render(<LoginPage />);
        expect(screen.getByText("Ver 7.3")).toBeInTheDocument();
    });

    // Test 28
    it("保護者ログインのタイトルが表示されること", async () => {
        const { default: LoginPage } = await import("@/app/parent/login/page");
        render(<LoginPage />);
        expect(screen.getByText("保護者ログイン")).toBeInTheDocument();
    });
});
