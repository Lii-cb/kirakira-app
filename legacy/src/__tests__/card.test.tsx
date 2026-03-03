import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

describe("Card コンポーネント", () => {
    // Test 16
    it("タイトルとコンテンツを表示すること", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>テストカード</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>コンテンツ</p>
                </CardContent>
            </Card>
        );
        expect(screen.getByText("テストカード")).toBeInTheDocument();
        expect(screen.getByText("コンテンツ")).toBeInTheDocument();
    });

    // Test 17
    it("追加のクラス名を受け付けること", () => {
        const { container } = render(<Card className="border-red-500">内容</Card>);
        expect(container.firstChild).toHaveClass("border-red-500");
    });
});
