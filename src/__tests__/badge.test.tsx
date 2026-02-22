import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge コンポーネント", () => {
    // Test 11
    it("テキストを表示すること", () => {
        render(<Badge>承認待ち</Badge>);
        expect(screen.getByText("承認待ち")).toBeInTheDocument();
    });

    // Test 12
    it("variant を切り替えられること", () => {
        const { container } = render(<Badge variant="destructive">エラー</Badge>);
        const badge = container.firstChild as HTMLElement;
        expect(badge.getAttribute("data-variant")).toBe("destructive");
    });
});
