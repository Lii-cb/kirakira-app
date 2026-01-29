"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, PlusCircle, History, Receipt } from "lucide-react";
import { getReservationsForChild, getPaymentsForChild, addPaymentRequest, getChildren } from "@/lib/firestore";
import { Reservation, Payment, Child } from "@/types/firestore";

export default function GuardianPaymentPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [childConfig, setChildConfig] = useState<Child | null>(null);
    const [loading, setLoading] = useState(true);
    const [inputAmount, setInputAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const childId = "child-1"; // Mock ID

    const fetchData = async () => {
        try {
            const [resData, payData, childrenData] = await Promise.all([
                getReservationsForChild(childId),
                getPaymentsForChild(childId),
                getChildren()
            ]);
            setReservations(resData);
            setPayments(payData);
            const myChild = childrenData.find(c => c.id === childId);
            setChildConfig(myChild || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePaymentSubmit = async () => {
        const amount = parseInt(inputAmount);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        try {
            await addPaymentRequest(childId, amount);
            await fetchData();
            setInputAmount("");
            alert("支払い報告を送信しました。");
        } catch (e) {
            console.error(e);
            alert("送信に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Calculations ---
    const totalDeposited = payments
        .filter(p => p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

    const isExempt = childConfig?.snackConfig?.isExempt || false;

    // Filter used reservations (only confirmed ones count as 'usage')
    // In a real system, we might use 'attendance' records for billing, but using reservations for now.
    const usedReservations = reservations.filter(r => r.status === "confirmed");

    const totalUsed = usedReservations.reduce((sum, r) => {
        const fee = r.fee || 0;
        const snack = (r.hasSnack && !isExempt) ? 100 : 0;
        return sum + fee + snack;
    }, 0);

    const currentBalance = totalDeposited - totalUsed;

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <h2 className="text-xl font-bold px-2">プール金残高</h2>

            {/* Balance Card */}
            <Card className={`border-2 shadow-md ${currentBalance < 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-white"}`}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">現在の残高</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`text-4xl font-bold ${currentBalance < 0 ? "text-red-600" : "text-gray-800"}`}>
                        ¥{currentBalance.toLocaleString()}
                    </div>
                    {currentBalance < 0 && (
                        <p className="text-sm text-red-600 font-bold mt-2">
                            ※ 残高が不足しています。早めの入金をお願いします。
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">支払い報告</CardTitle>
                    <CardDescription>
                        職員に現金を渡したり、振込をした後に報告してください。
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
                        <Input
                            type="number"
                            className="pl-8"
                            placeholder="例: 10000"
                            value={inputAmount}
                            onChange={(e) => setInputAmount(e.target.value)}
                        />
                    </div>
                    <Button onClick={handlePaymentSubmit} disabled={isSubmitting || !inputAmount}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "報告する"}
                    </Button>
                </CardContent>
            </Card>

            {/* History Tabs */}
            <Tabs defaultValue="payments">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="payments">入金履歴</TabsTrigger>
                    <TabsTrigger value="usage">利用実績</TabsTrigger>
                </TabsList>

                <TabsContent value="payments" className="space-y-3 mt-4">
                    {payments.length === 0 ? <div className="text-center text-muted-foreground py-4">履歴はありません</div> :
                        payments.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                                <div>
                                    <div className="font-bold text-gray-800">¥{p.amount.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground">{p.date.replaceAll('-', '/')} 支払</div>
                                </div>
                                <Badge variant={p.status === "confirmed" ? "default" : "secondary"}>
                                    {p.status === "confirmed" ? "受領済" : "確認中"}
                                </Badge>
                            </div>
                        ))
                    }
                </TabsContent>

                <TabsContent value="usage" className="space-y-3 mt-4">
                    {usedReservations.length === 0 ? <div className="text-center text-muted-foreground py-4">利用履歴はありません</div> :
                        usedReservations.map(r => {
                            const fee = r.fee || 0;
                            const snack = (r.hasSnack && !isExempt) ? 100 : 0;
                            const total = fee + snack;
                            return (
                                <div key={r.id} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-100 p-2 rounded-full">
                                            <Receipt className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{r.date.slice(5).replace('-', '/')} 利用</div>
                                            <div className="text-xs text-muted-foreground">
                                                基本: ¥{fee} / おやつ: ¥{snack}
                                                {isExempt && <span className="text-orange-500 ml-1">(免除)</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-red-600">-¥{total}</span>
                                </div>
                            );
                        })
                    }
                </TabsContent>
            </Tabs>

        </div>
    );
}
