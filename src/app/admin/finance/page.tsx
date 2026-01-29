"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, Ban } from "lucide-react";
import { getAllPayments, confirmPayment, getChildren } from "@/lib/firestore";
import { Payment, Child } from "@/types/firestore";

export default function AdminFinancePage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [payData, childData] = await Promise.all([
                getAllPayments(),
                getChildren()
            ]);
            setPayments(payData);
            setChildren(childData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getChildName = (childId: string) => {
        const c = children.find(c => c.id === childId);
        return c ? c.name : childId;
    };

    const handleConfirm = async (id: string) => {
        if (!confirm("入金を受領済みにしますか？\n（プール金残高に反映されます）")) return;

        setProcessingId(id);
        try {
            await confirmPayment(id);
            // Update local state for immediate feedback
            setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "confirmed" } : p));
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        } finally {
            setProcessingId(null);
        }
    };

    const pendingPayments = payments.filter(p => p.status === "pending");
    const historyPayments = payments.filter(p => p.status !== "pending");

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">金銭管理・入金確認</h1>

            {/* Pending Requests */}
            <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        入金承認待ち
                        {pendingPayments.length > 0 && <Badge variant="destructive">{pendingPayments.length}件</Badge>}
                    </CardTitle>
                    <CardDescription>
                        保護者から報告された入金を確認し、承認してください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingPayments.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">承認待ちの入金はありません。</div>
                    ) : (
                        <Table className="bg-white rounded-md overflow-hidden shadow-sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>報告日</TableHead>
                                    <TableHead>児童名</TableHead>
                                    <TableHead>金額</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingPayments.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.date}</TableCell>
                                        <TableCell className="font-medium">{getChildName(p.childId)}</TableCell>
                                        <TableCell className="text-lg font-bold">¥{p.amount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleConfirm(p.id)}
                                                disabled={processingId === p.id}
                                            >
                                                {processingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> 確認</>}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* History */}
            <Card>
                <CardHeader>
                    <CardTitle>入金履歴</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>報告日</TableHead>
                                <TableHead>児童名</TableHead>
                                <TableHead>金額</TableHead>
                                <TableHead>状態</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyPayments.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.date}</TableCell>
                                    <TableCell>{getChildName(p.childId)}</TableCell>
                                    <TableCell>¥{p.amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-gray-100"><CheckCircle className="w-3 h-3 mr-1" /> 受領済</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
