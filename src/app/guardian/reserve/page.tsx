"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { submitReservations, getReservationsForChild } from "@/lib/firestore";
import { Reservation } from "@/types/firestore";
import { Loader2 } from "lucide-react";

export default function GuardianReservePage() {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    const [selectedTime, setSelectedTime] = useState("standard");
    const [wantsSnack, setWantsSnack] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            // Mock Child ID for MVP - in real app this comes from auth context
            const data = await getReservationsForChild("child-1");
            setReservations(data);
        };
        fetchHistory();
    }, []);

    // Fee Calculation
    const daysCount = dates?.length || 0;
    const basicFee = 0;
    const snackFeePerDay = wantsSnack ? 100 : 0;
    const extraFeePerDay = (selectedTime === "extended" || selectedTime === "late") ? 100 : 0;

    const totalDailyFee = basicFee + snackFeePerDay + extraFeePerDay;
    const totalEstimatedFee = totalDailyFee * daysCount;

    const handleReserve = async () => {
        if (!dates || dates.length === 0) {
            alert("日付を選択してください。");
            return;
        }

        setIsSubmitting(true);
        try {
            const childId = "child-1";
            const timeLabel = selectedTime === "standard" ? "14:00-17:00" :
                selectedTime === "extended" ? "14:00-18:00" : "15:00-18:00";

            // Calculate fee for one day (assuming same for all selected days)
            const dayFee = basicFee + snackFeePerDay + extraFeePerDay;

            await submitReservations(childId, dates, timeLabel, {
                fee: dayFee,
                hasSnack: wantsSnack
            });

            alert(`${daysCount}件の予約リクエストを送信しました。\n予定利用料: ${totalEstimatedFee}円`);
            setDates([]);
            // Refresh history
            const data = await getReservationsForChild("child-1");
            setReservations(data);
        } catch (error) {
            console.error(error);
            alert("予約に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <h2 className="text-xl font-bold px-2">利用予約</h2>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md">新規予約 (複数選択可)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex flex-col items-center">
                    <div className="p-2 border rounded-md">
                        <Calendar
                            mode="multiple"
                            selected={dates}
                            onSelect={setDates}
                            className="rounded-md"
                        />
                    </div>

                    <div className="w-full bg-blue-50 p-4 rounded-lg text-blue-900 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span>選択日数:</span>
                            <span className="font-bold">{daysCount} 日</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-2">
                            <span>基本料金:</span>
                            <span>0円</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>おやつ代 (100円/回):</span>
                            <span>{snackFeePerDay * daysCount}円</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>延長料金 (100円/回):</span>
                            <span>{extraFeePerDay * daysCount}円</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg border-t border-blue-200 pt-2 mt-1">
                            <span>合計見積:</span>
                            <span>{totalEstimatedFee}円</span>
                        </div>
                        <div className="text-[10px] text-blue-700 mt-1">
                            ※ キャンセル時の返金はありません（おやつのみお返しします）。<br />
                            ※ 追加料金は2ヶ月後に徴収されます。
                        </div>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">希望時間</label>
                            <Select value={selectedTime} onValueChange={setSelectedTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder="時間を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">標準 (14:00-17:00)</SelectItem>
                                    <SelectItem value="extended">延長 (14:00-18:00) +100円</SelectItem>
                                    <SelectItem value="late">遅め (15:00-18:00) +100円</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 border p-3 rounded-md">
                            <Checkbox
                                id="snack"
                                checked={wantsSnack}
                                onCheckedChange={(c: boolean | "indeterminate") => setWantsSnack(!!c)}
                            />
                            <label
                                htmlFor="snack"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                おやつを希望する (+100円)
                            </label>
                        </div>
                    </div>

                    <Button className="w-full font-bold" onClick={handleReserve} disabled={!dates || dates.length === 0 || isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "予約リクエストを送信"}
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-2 px-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">予約状況一覧</h3>
                    <div className="text-xs text-muted-foreground">{reservations.length}件</div>
                </div>

                <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                    <div className="grid grid-cols-4 bg-gray-100 p-2 text-xs font-medium text-gray-500 text-center">
                        <div>日付</div>
                        <div>時間/料金</div>
                        <div>オプション</div>
                        <div>状況</div>
                    </div>
                    <div className="divide-y max-h-[300px] overflow-y-auto">
                        {reservations.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500 col-span-4">予約履歴はありません</div>
                        ) : (
                            reservations.map((res) => (
                                <div key={res.id} className="grid grid-cols-4 p-3 items-center text-sm hover:bg-gray-50">
                                    <div className="text-center font-bold text-gray-800 text-xs">
                                        {res.date}
                                    </div>
                                    <div className="text-center text-xs">
                                        <div>{res.time}</div>
                                        <div className="text-muted-foreground">{res.fee ? `¥${res.fee}` : "-"}</div>
                                    </div>
                                    <div className="text-center text-xs text-muted-foreground">
                                        {res.hasSnack ? "おやつ有" : "-"}
                                    </div>
                                    <div className="flex justify-center">
                                        <Badge variant={res.status === "confirmed" ? "secondary" : "outline"} className={res.status === "confirmed" ? "bg-green-100 text-green-700" : ""}>
                                            {res.status === "confirmed" ? "確定" : res.status === "rejected" ? "不可" : "申請中"}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
