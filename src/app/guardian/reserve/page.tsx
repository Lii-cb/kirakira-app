"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { submitReservations, getReservationsForChild, cancelReservation, getChildren } from "@/lib/firestore";
import { Reservation, Child } from "@/types/firestore";
import { Loader2, Trash2, Cookie } from "lucide-react";

export default function GuardianReservePage() {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    const [selectedTime, setSelectedTime] = useState("standard");
    const [wantsSnack, setWantsSnack] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [childConfig, setChildConfig] = useState<Child | null>(null);

    // Dialog State
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const childId = "child-1"; // Mock ID

    useEffect(() => {
        const loadData = async () => {
            const [resData, childrenData] = await Promise.all([
                getReservationsForChild(childId),
                getChildren()
            ]);
            setReservations(resData);
            const myChild = childrenData.find(c => c.id === childId);
            setChildConfig(myChild || null);

            // If exempt, force snack off
            if (myChild?.snackConfig?.isExempt) {
                setWantsSnack(false);
            }
        };
        loadData();
    }, []);

    const fetchHistory = async () => {
        const data = await getReservationsForChild(childId);
        setReservations(data);
    };

    // Derived State for Calendar
    const bookedDates = reservations.map(r => new Date(r.date.replaceAll('-', '/')));

    const isDateDisabled = (date: Date) => {
        return bookedDates.some(booked =>
            booked.getFullYear() === date.getFullYear() &&
            booked.getMonth() === date.getMonth() &&
            booked.getDate() === date.getDate()
        );
    };

    const isSnackExempt = childConfig?.snackConfig?.isExempt || false;

    // Fee Calculation
    const daysCount = dates?.length || 0;
    const basicFee = 0;
    // If exempt, snack fee is 0 regardless of checkbox (though checkbox should be disabled)
    // If not exempt, use checkbox
    const effectiveWantsSnack = isSnackExempt ? false : wantsSnack;
    const snackFeePerDay = effectiveWantsSnack ? 100 : 0;
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
            const timeLabel = selectedTime === "standard" ? "14:00-17:00" :
                selectedTime === "extended" ? "14:00-18:00" : "15:00-18:00";

            const dayFee = basicFee + snackFeePerDay + extraFeePerDay;

            await submitReservations(childId, dates, timeLabel, {
                fee: dayFee,
                hasSnack: effectiveWantsSnack
            });

            alert(`${daysCount}件の予約リクエストを送信しました。\n予定利用料: ${totalEstimatedFee}円`);
            setDates([]);
            fetchHistory();
        } catch (error) {
            console.error(error);
            alert("予約に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!selectedReservation) return;
        if (!confirm("本当にこの予約を取り消しますか？")) return;

        try {
            await cancelReservation(selectedReservation.id);
            alert("予約を取り消しました。");
            setIsDialogOpen(false);
            fetchHistory();
        } catch (error) {
            console.error(error);
            alert("取り消しに失敗しました。");
        }
    };

    const handleCalendarSelect = (newDates: Date[] | undefined) => {
        if (!newDates) {
            setDates([]);
            return;
        }
        // Helper to filter out disabled dates if they somehow get selected (though 'disabled' prop should prevent this)
        // Actually, we use 'disabled' prop to prevent selecting booked dates.
        setDates(newDates);
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <h2 className="text-xl font-bold px-2">利用予約</h2>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md">新規予約 (複数選択可)</CardTitle>
                    <CardDescription>
                        日付をタップして選択してください。<br />
                        <span className="text-red-500 text-xs">● 予約済み</span> /
                        <span className="text-blue-500 text-xs ml-2">● 選択中</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex flex-col items-center">
                    <div className="p-2 border rounded-md">
                        <Calendar
                            mode="multiple"
                            selected={dates}
                            onSelect={handleCalendarSelect}
                            className="rounded-md"
                            disabled={isDateDisabled}
                            modifiers={{
                                booked: bookedDates
                            }}
                            modifiersStyles={{
                                booked: {
                                    textDecoration: "underline",
                                    fontWeight: "bold",
                                    color: "#ef4444" // red-500
                                }
                            }}
                        />
                    </div>

                    {/* Booking Form (Only show if dates selected) */}
                    {daysCount > 0 && (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-blue-50 p-4 rounded-lg text-blue-900 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span>選択日数:</span>
                                    <span className="font-bold">{daysCount} 日</span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-lg border-t border-blue-200 pt-2 mt-1">
                                    <span>合計見積:</span>
                                    <span>{totalEstimatedFee}円</span>
                                </div>
                            </div>

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

                            <div className={`flex items-start space-x-2 border p-3 rounded-md ${isSnackExempt ? "bg-gray-100 opacity-80" : "bg-white"}`}>
                                <Checkbox
                                    id="snack"
                                    checked={isSnackExempt ? false : wantsSnack}
                                    onCheckedChange={(c: boolean | "indeterminate") => setWantsSnack(!!c)}
                                    disabled={isSnackExempt}
                                    className="mt-1"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="snack"
                                        className="text-sm font-medium leading-none flex items-center gap-2"
                                    >
                                        おやつを希望する
                                        {isSnackExempt ? (
                                            <Badge variant="outline" className="text-[10px] bg-gray-200 text-gray-600">年間設定で無し</Badge>
                                        ) : (
                                            <span className="text-xs font-normal text-muted-foreground">(+100円)</span>
                                        )}
                                    </label>
                                    {!isSnackExempt && (
                                        <p className="text-xs text-muted-foreground">
                                            短時間の利用などで不要な場合はチェックを外してください。
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Button className="w-full font-bold" onClick={handleReserve} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "予約リクエストを送信"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-2 px-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">現在の予約状況</h3>
                    <div className="text-xs text-muted-foreground">タップして詳細・取消</div>
                </div>

                <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                    <div className="grid grid-cols-4 bg-gray-100 p-2 text-xs font-medium text-gray-500 text-center">
                        <div>日付</div>
                        <div>時間</div>
                        <div>おやつ</div>
                        <div>状況</div>
                    </div>
                    <div className="divide-y max-h-[300px] overflow-y-auto">
                        {reservations.map((res) => (
                            <div
                                key={res.id}
                                className="grid grid-cols-4 p-3 items-center text-sm hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                                onClick={() => {
                                    setSelectedReservation(res);
                                    setIsDialogOpen(true);
                                }}
                            >
                                <div className="text-center font-bold text-gray-800 text-xs">{res.date}</div>
                                <div className="text-center text-xs">{res.time}</div>
                                <div className="text-center text-xs text-muted-foreground">{res.hasSnack ? "有" : "-"}</div>
                                <div className="flex justify-center">
                                    <Badge variant={res.status === "confirmed" ? "secondary" : "outline"} className={res.status === "confirmed" ? "bg-green-100 text-green-700" : ""}>
                                        {res.status === "confirmed" ? "確定" : "申請中"}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>予約詳細</DialogTitle>
                        <DialogDescription>
                            予約内容の確認、または取り消しを行えます。
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReservation && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">日付:</span>
                                <span className="font-bold">{selectedReservation.date}</span>

                                <span className="text-muted-foreground">利用時間:</span>
                                <span>{selectedReservation.time}</span>

                                <span className="text-muted-foreground">おやつ:</span>
                                <span>{selectedReservation.hasSnack ? "あり" : "なし"}</span>

                                <span className="text-muted-foreground">ステータス:</span>
                                <Badge variant="outline">{selectedReservation.status}</Badge>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex sm:justify-between gap-2">
                        <Button variant="destructive" onClick={handleCancelReservation} className="w-full sm:w-auto">
                            <Trash2 className="mr-2 h-4 w-4" />
                            予約を取り消す
                        </Button>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">閉じる</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
