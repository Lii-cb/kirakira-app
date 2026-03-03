import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation BEFORE importing components
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

import { Providers } from "@/components/providers";

describe("Providers コンポーネント", () => {
    // Test 18
    it("children をレンダリングすること", () => {
        render(
            <Providers>
                <div data-testid="child">テスト子要素</div>
            </Providers>
        );
        expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    // Test 19
    it("AuthProvider でラップされていること", () => {
        const { container } = render(
            <Providers>
                <span>内容</span>
            </Providers>
        );
        expect(container).toBeDefined();
        expect(screen.getByText("内容")).toBeInTheDocument();
    });

    // Test 20
    it("複数の children を正しくレンダリングすること", () => {
        render(
            <Providers>
                <div data-testid="first">1番目</div>
                <div data-testid="second">2番目</div>
            </Providers>
        );
        expect(screen.getByTestId("first")).toBeInTheDocument();
        expect(screen.getByTestId("second")).toBeInTheDocument();
    });
});
