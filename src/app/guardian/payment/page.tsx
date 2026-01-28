"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CreditCard, Clock, Loader2 } from "lucide-react";
import { getReservationsForChild } from "@/lib/firestore";
import { Reservation } from "@/types/firestore";

export default function GuardianPaymentPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                // In real app, get childId from auth
                const data = await getReservationsForChild("child-1");
                setReservations(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    // Calculate Current Month Bill
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthLabel = `${currentYear}年 ${currentMonthNum}月分`;
    // Payment due is usually next month 10th
    const dueDate = new Date(currentYear, currentMonthNum, 10).toLocaleDateString();

    const thisMonthReservations = reservations.filter(r => {
        // Date format is YYYY-MM-DD
        const [y, m, d] = r.date.split('-').map(Number);
        return y === currentYear && m === currentMonthNum;
    });

    const totalFee = thisMonthReservations.reduce((sum, r) => sum + (r.fee || 0), 0);
    const snackFee = thisMonthReservations.filter(r => r.hasSnack).length * 100;
    // Assuming 'fee' includes snack fee, we should separate them for display if needed.
    // In reserve page: dayFee = basic + snack + extra.
    // So totalFee is the grand total.
    // We can estimate 'Basic' vs 'Extra' roughly.
    // Let's explicitly calculate snack portion for display.
    const basicAndExtra = totalFee - snackFee;

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <h2 className="text-xl font-bold px-2">利用料金</h2>

            {/* Current Month Bill */}
            <Card className="border-2 border-primary/20 shadow-md overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3 pt-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-gray-800">{currentMonthLabel} ご請求</CardTitle>
                        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 shadow-sm">未確定</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-center mb-8">
                        <div className="text-sm text-muted-foreground mb-1">お支払い予定金額</div>
                        <div className="text-5xl font-black text-gray-900 tracking-tight">
                            ¥{totalFee.toLocaleString()}
                        </div>
                        <div className="text-sm text-red-600 font-bold mt-3 flex items-center justify-center gap-1 bg-red-50 py-1 px-3 rounded-full w-fit mx-auto">
                            <Clock className="h-3 w-3" />
                            お支払い期限: {dueDate}
                        </div>
                    </div>

                    <div className="divide-y border-t border-b">
                        <div className="flex justify-between items-center py-3 text-sm">
                            <div>
                                <div className="font-medium text-gray-700">利用料 (基本+延長)</div>
                                <div className="text-xs text-gray-400">利用日数: {thisMonthReservations.length}日</div>
                            </div>
                            <span className="font-bold text-gray-900">¥{basicAndExtra.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 text-sm">
                            <div>
                                <div className="font-medium text-gray-700">おやつ代</div>
                                <div className="text-xs text-gray-400">回数: {snackFee / 100}回</div>
                            </div>
                            <span className="font-bold text-gray-900">¥{snackFee.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3 text-base font-bold bg-gray-50 -mx-6 px-6 mt-4 border-t">
                        <span>合計</span>
                        <span>¥{totalFee.toLocaleString()}</span>
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-2 bg-gray-50/50 pt-4 pb-6">
                    <Button className="w-full h-12 text-lg font-bold shadow-md" disabled={totalFee === 0}>
                        <CreditCard className="mr-2 h-5 w-5" />
                        オンラインで支払う
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                        ※ 金額は月末に確定します。現在表示等は概算です。
                    </p>
                </CardFooter>
            </Card>

            {/* History Link (Mock) */}
            <div className="text-center">
                <Button variant="link" className="text-muted-foreground">過去の履歴を見る</Button>
            </div>
        </div>
    );
}
