"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CreditCard, Clock } from "lucide-react";

export default function GuardianPaymentPage() {
    // Mock Data
    const currentMonth = {
        month: "2026年 1月分",
        totalAmount: 3700,
        status: "unpaid", // paid, unpaid
        dueDate: "2026/02/10",
        details: [
            { label: "基本利用料", amount: 0, note: "標準コース" },
            { label: "おやつ代", amount: 1500, note: "15回分 (@100)" },
            { label: "追加利用料 (12月分)", amount: 2200, note: "延長 4回 / 夕食 1回" },
        ]
    };

    const history = [
        { month: "2025年 12月分", amount: 4500, status: "paid", date: "2026/01/27" },
        { month: "2025年 11月分", amount: 3200, status: "paid", date: "2025/12/26" },
        { month: "2025年 10月分", amount: 5000, status: "paid", date: "2025/11/27" },
    ];

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <h2 className="text-xl font-bold px-2">利用料金</h2>

            {/* Current Month Bill */}
            <Card className="border-2 border-primary/20 shadow-md overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3 pt-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-gray-800">{currentMonth.month} ご請求</CardTitle>
                        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 shadow-sm">未払い</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-center mb-8">
                        <div className="text-sm text-muted-foreground mb-1">お支払い金額</div>
                        <div className="text-5xl font-black text-gray-900 tracking-tight">
                            ¥{currentMonth.totalAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-red-600 font-bold mt-3 flex items-center justify-center gap-1 bg-red-50 py-1 px-3 rounded-full w-fit mx-auto">
                            <Clock className="h-3 w-3" />
                            お支払い期限: {currentMonth.dueDate}
                        </div>
                    </div>

                    <div className="divide-y border-t border-b">
                        {currentMonth.details.map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-3 text-sm">
                                <div>
                                    <div className="font-medium text-gray-700">{item.label}</div>
                                    {item.note && <div className="text-xs text-gray-400">{item.note}</div>}
                                </div>
                                <span className="font-bold text-gray-900">¥{item.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center py-3 text-base font-bold bg-gray-50 -mx-6 px-6 mt-4 border-t">
                        <span>合計</span>
                        <span>¥{currentMonth.totalAmount.toLocaleString()}</span>
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-2 bg-gray-50/50 pt-4 pb-6">
                    <Button className="w-full h-12 text-lg font-bold shadow-md">
                        <CreditCard className="mr-2 h-5 w-5" />
                        オンラインで支払う
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                        ※ クレジットカード決済、PayPay決済がご利用いただけます
                    </p>
                </CardFooter>
            </Card>

            {/* History */}
            <div className="px-2">
                <h3 className="font-semibold text-lg mb-3">お支払い履歴</h3>
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden divide-y">
                    {history.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-gray-800">{item.month}</span>
                                <span className="text-xs text-gray-400">決済日: {item.date}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-gray-900">¥{item.amount.toLocaleString()}</div>
                                <div className="flex items-center justify-end gap-1 text-[10px] text-green-600 font-bold mt-1">
                                    <Download className="h-3 w-3" />
                                    <span>領収書</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
