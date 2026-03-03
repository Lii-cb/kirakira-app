import { describe, it, expect } from "vitest";
import type { Child, AttendanceRecord, Reservation } from "@/types/firestore";

describe("Firestore 型定義", () => {
    // Test 6
    it("Child 型が必要なフィールドを持つこと", () => {
        const child: Child = {
            id: "test-1",
            name: "田中太郎",
            kana: "タナカタロウ",
            grade: 1,
        };
        expect(child.id).toBe("test-1");
        expect(child.name).toBe("田中太郎");
        expect(child.grade).toBe(1);
    });

    // Test 7
    it("AttendanceRecord のステータスが正しい型であること", () => {
        const record: AttendanceRecord = {
            id: "att-1",
            date: "2026-02-14",
            childId: "child-1",
            childName: "田中太郎",
            className: "1-1",
            status: "arrived",
            reservationTime: "14:00-17:00",
            returnMethod: "お迎え",
        };
        expect(["pending", "arrived", "left", "absent"]).toContain(record.status);
    });

    // Test 8
    it("Reservation のステータスが正しい型であること", () => {
        const res: Reservation = {
            id: "res-1",
            childId: "child-1",
            date: "2026-02-14",
            time: "14:00-17:00",
            status: "confirmed",
            createdAt: new Date().toISOString(),
        };
        expect(["pending", "confirmed", "rejected"]).toContain(res.status);
    });
});
