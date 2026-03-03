import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn ユーティリティ", () => {
    // Test 4
    it("クラス名を結合できること", () => {
        expect(cn("foo", "bar")).toBe("foo bar");
    });

    // Test 5
    it("条件付きクラスをマージできること", () => {
        const result = cn("base", false && "hidden", "visible");
        expect(result).toBe("base visible");
    });
});
