"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import { getReservations, updateReservationStatus, getChildren } from "@/lib/firestore";
import { Reservation, Child } from "@/types/firestore";

export default function AdminCalendarPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [reservations, setReservations] = React.useState<Reservation[]>([]);
    const [children, setChildren] = React.useState<Map<string, Child>>(new Map());
    const [loading, setLoading] = React.useState(false);

    // Fetch children for name lookup
    React.useEffect(() => {
        const fetchChildren = async () => {
            const data = await getChildren();
            const map = new Map();
            data.forEach(c => map.set(c.id, c));
            setChildren(map);
        };
        fetchChildren();
    }, []);

    const fetchReservations = React.useCallback(async () => {
        if (!date) return;
        setLoading(true);
        try {
            const dateStr = date.toLocaleDateString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
            const data = await getReservations(dateStr);
            setReservations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [date]);

    React.useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    const handleStatusUpdate = async (id: string, status: "confirmed" | "rejected") => {
        try {
            await updateReservationStatus(id, status);
            await fetchReservations(); // Refresh
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const count = reservations.filter(r => r.status === "confirmed").length;
    const pendingCount = reservations.filter(r => r.status === "pending").length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">予約台帳</h2>
                    <p className="text-muted-foreground">月ごとの予約状況と開所日を管理します。</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">詳細リスト印刷</Button>
                    <Button>新規予約登録</Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[400px_1fr]">
                {/* Left: Calendar Picker */}
                <Card>
                    <CardHeader>
                        <CardTitle>カレンダー</CardTitle>
                        <CardDescription>日付を選択して詳細を確認</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border p-4"
                        />
                    </CardContent>
                </Card>

                {/* Right: Daily Detail */}
                <Card className="flex flex-col">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">
                                {date ? date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '日付を選択'}
                            </CardTitle>
                            <Badge variant={date && date.getDay() === 0 ? "destructive" : "secondary"}>
                                {date && date.getDay() === 0 ? "閉所日" : "開所日"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-6">
                        {date ? (
                            <div className="space-y-6">
                                {/* Summary Metrics */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="border rounded-lg p-4 text-center">
                                        <div className="text-muted-foreground text-xs mb-1">予約確定</div>
                                        <div className="text-2xl font-bold flex items-center justify-center gap-2">
                                            <Users className="h-5 w-5 text-primary" />
                                            {count}
                                        </div>
                                    </div>
                                    <div className="border rounded-lg p-4 text-center bg-yellow-50 border-yellow-100">
                                        <div className="text-muted-foreground text-xs mb-1 text-yellow-800">未承認</div>
                                        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                                    </div>
                                    <div className="border rounded-lg p-4 text-center">
                                        <div className="text-muted-foreground text-xs mb-1">空き状況</div>
                                        <div className="text-2xl font-bold text-gray-400">---</div>
                                    </div>
                                </div>

                                {/* Daily Reservation List */}
                                <div className="border rounded-md">
                                    {loading ? (
                                        <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>
                                    ) : reservations.length === 0 ? (
                                        <div className="p-10 text-center text-muted-foreground">予約はありません。</div>
                                    ) : (
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-muted-foreground border-b">
                                                <tr>
                                                    <th className="p-3 font-medium">児童名</th>
                                                    <th className="p-3 font-medium">クラス</th>
                                                    <th className="p-3 font-medium">希望時間</th>
                                                    <th className="p-3 font-medium">状態</th>
                                                    <th className="p-3 font-medium text-right">アクション</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {reservations.map(res => {
                                                    const child = children.get(res.childId);
                                                    return (
                                                        <tr key={res.id} className="hover:bg-gray-50">
                                                            <td className="p-3 font-medium">
                                                                {child ? child.name : "不明な児童"}
                                                                <div className="text-xs text-muted-foreground">{res.childId}</div>
                                                            </td>
                                                            <td className="p-3 text-muted-foreground">{child?.className || "-"}</td>
                                                            <td className="p-3">{res.time}</td>
                                                            <td className="p-3">
                                                                {res.status === "pending" ? (
                                                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">承認待ち</Badge>
                                                                ) : res.status === "confirmed" ? (
                                                                    <Badge variant="secondary" className="bg-green-100 text-green-700">確定済</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">却下</Badge>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {res.status === "pending" && (
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleStatusUpdate(res.id, "rejected")}>却下</Button>
                                                                        <Button size="sm" onClick={() => handleStatusUpdate(res.id, "confirmed")}>承認</Button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                左のカレンダーから日付を選択してください。
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
