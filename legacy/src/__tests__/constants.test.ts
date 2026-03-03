import { describe, it, expect } from "vitest";
import { SIBLING_COLORS, APP_VERSION } from "@/lib/constants";

describe("constants", () => {
    // Test 1
    it("APP_VERSION は Ver 7.3 であること", () => {
        expect(APP_VERSION).toBe("Ver 7.3");
    });

    // Test 2
    it("SIBLING_COLORS は4色定義されていること", () => {
        expect(SIBLING_COLORS).toHaveLength(4);
        expect(SIBLING_COLORS[0].name).toBe("blue");
        expect(SIBLING_COLORS[1].name).toBe("green");
        expect(SIBLING_COLORS[2].name).toBe("orange");
        expect(SIBLING_COLORS[3].name).toBe("purple");
    });

    // Test 3
    it("各色テーマに必要なプロパティが含まれること", () => {
        for (const color of SIBLING_COLORS) {
            expect(color).toHaveProperty("bg");
            expect(color).toHaveProperty("light");
            expect(color).toHaveProperty("text");
            expect(color).toHaveProperty("border");
            expect(color).toHaveProperty("badge");
        }
    });
});
