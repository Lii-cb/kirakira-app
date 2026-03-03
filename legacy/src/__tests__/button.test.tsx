import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button コンポーネント", () => {
    // Test 13
    it("テキストを表示すること", () => {
        render(<Button>クリック</Button>);
        expect(screen.getByRole("button", { name: "クリック" })).toBeInTheDocument();
    });

    // Test 14
    it("disabled 状態を正しく反映すること", () => {
        render(<Button disabled>送信</Button>);
        expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
    });

    // Test 15
    it("variant ghost が data-variant に反映されること", () => {
        const { container } = render(<Button variant="ghost">ゴースト</Button>);
        const button = container.querySelector("button");
        expect(button?.getAttribute("data-variant")).toBe("ghost");
    });
});
