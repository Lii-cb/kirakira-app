"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, PlusCircle, History, Receipt, User } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getReservationsForChild, getPaymentsForChild, addPaymentRequest } from "@/lib/firestore";
import { Reservation, Payment } from "@/types/firestore";
import { useParentChildren, ChildData } from "@/hooks/use-parent-children";
import { useSearchParams } from "next/navigation";

function ParentPaymentContent() {
    const searchParams = useSearchParams();
    const childIdParam = searchParams.get("childId");
    const { childrenData, loading: childrenLoading, isAdminViewing } = useParentChildren(childIdParam);
    const [activeChildId, setActiveChildId] = useState<string | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputAmount, setInputAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Set first child as active when children load
    useEffect(() => {
        if (childrenData.length > 0 && !activeChildId) {
            setActiveChildId(childrenData[0].id);
        }
    }, [childrenData, activeChildId]);

    // Fetch data when active child changes
    const fetchData = async (childId: string) => {
        setLoading(true);
        try {
            const [resData, payData] = await Promise.all([
                getReservationsForChild(childId),
                getPaymentsForChild(childId),
            ]);
            setReservations(resData);
            setPayments(payData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeChildId) {
            fetchData(activeChildId);
        }
    }, [activeChildId]);

    const handlePaymentSubmit = async () => {
        if (!activeChildId) return;
        const amount = parseInt(inputAmount);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        try {
            await addPaymentRequest(activeChildId, amount);
            await fetchData(activeChildId);
            setInputAmount("");
            alert("支払い報告を送信しました。");
        } catch (e: unknown) {
            console.error(e);
            const firebaseError = e as { code?: string };
            if (firebaseError.code === 'permission-denied') {
                alert("権限がありません。ログインし直してください。");
            } else {
                alert("送信に失敗しました。通信環境を確認してください。");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Calculations ---
    const activeChild = childrenData.find(c => c.id === activeChildId);
    const isExempt = activeChild?.master.snackConfig?.isExempt || false;

    const totalDeposited = payments
        .filter(p => p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

    const usedReservations = reservations.filter(r => r.status === "confirmed");

    const totalUsed = usedReservations.reduce((sum, r) => {
        const fee = r.fee || 0;
        const snack = (r.hasSnack && !isExempt) ? 100 : 0;
        return sum + fee + snack;
    }, 0);

    const currentBalance = totalDeposited - totalUsed;

    if (childrenLoading) return <div className="flex justify-center p-10"><Spinner /></div>;

    if (childrenData.length === 0) {
        return (
            <div className="p-4 text-center">
                <p>登録されている児童が見つかりません。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            {isAdminViewing && (
                <div className="bg-red-50 border border-red-200 p-3 mx-2 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                    <p className="text-xs font-bold text-red-700">管理者モードとして閲覧・操作中</p>
                </div>
            )}
            <h2 className="text-xl font-bold px-2">利用料残高</h2>

            {/* Child Selector */}
            {childrenData.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 px-2">
                    {childrenData.map((child) => (
                        <button
                            key={child.id}
                            onClick={() => setActiveChildId(child.id)}
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap
                                ${activeChildId === child.id
                                    ? `${child.colorTheme.bg} text-white shadow-md`
                                    : "bg-white text-gray-600 border hover:bg-gray-50"}
                            `}
                        >
                            <User className="w-4 h-4" />
                            {child.master.name}
                        </button>
                    ))}
                </div>
            )}
            {childrenData.length === 1 && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mx-2 ${childrenData[0].colorTheme.badge}`}>
                    <User className="w-4 h-4" />
                    {childrenData[0].master.name}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-10"><Spinner /></div>
            ) : (
                <>
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
                            <CardTitle className="text-lg">入金報告</CardTitle>
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
                                {isSubmitting ? <Spinner /> : "報告する"}
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
                </>
            )}
        </div>
    );
}

export default function ParentPaymentPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center p-10"><Spinner /></div>
        }>
            <ParentPaymentContent />
        </Suspense>
    );
}
