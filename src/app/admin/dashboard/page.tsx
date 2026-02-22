"use client";

import { Button } from "@/components/ui/button";
import { DailyAttendanceList } from "@/components/admin/daily-attendance-list";
import { seedChildren, ensureAttendanceRecords, getChildren } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
    const handleSeed = async () => {
        if (confirm("初期データを投入しますか？")) {
            await seedChildren();
            const children = await getChildren();
            const today = new Date().toISOString().split('T')[0];
            await ensureAttendanceRecords(today, children);
            alert("完了しました。リロードしてください。");
        }
    };

    return (
        <div className="space-y-4">
            {process.env.NODE_ENV === 'development' && (
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleSeed}>初期データ投入 (Dev)</Button>
                </div>
            )}
            {/* Daily Attendance List */}
            <DailyAttendanceList />
        </div>
    );
}
