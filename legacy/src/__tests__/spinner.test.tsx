import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "@/components/ui/spinner";

describe("Spinner コンポーネント", () => {
    // Test 9
    it("レンダリングされること", () => {
        render(<Spinner />);
        const spinner = document.querySelector("svg");
        expect(spinner).toBeInTheDocument();
    });

    // Test 10
    it("追加のクラス名を受け付けること", () => {
        render(<Spinner className="text-blue-500" />);
        const spinner = document.querySelector("svg");
        expect(spinner?.classList.contains("text-blue-500")).toBe(true);
    });
});
