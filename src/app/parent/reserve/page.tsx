"use client";

import { useState, useEffect, Suspense } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getReservations, updateReservationStatus, getChildren, submitReservations, subscribeReservationsForChild, cancelReservation } from "@/lib/firestore";
import { Reservation } from "@/types/firestore";
import { Trash2, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ja } from "date-fns/locale";
import { useParentChildren, ChildData } from "@/hooks/use-parent-children";


function ParentReserveContent() {
    const searchParams = useSearchParams();
    const childIdParam = searchParams.get("childId");
    const { childrenData, loading, isAdminViewing } = useParentChildren(childIdParam);

    const [activeChildId, setActiveChildId] = useState<string | null>(null);

    const [dates, setDates] = useState<Date[] | undefined>([]);
    const [selectedTime, setSelectedTime] = useState("1700");
    const [wantsSnack, setWantsSnack] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    // Dialog State
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Set first child as active when children load
    useEffect(() => {
        if (childrenData.length > 0 && !activeChildId) {
            setActiveChildId(childrenData[0].id);
        }
    }, [childrenData, activeChildId]);

    // Subscribe to Reservations when Active Child Changes
    useEffect(() => {
        if (!activeChildId) return;

        const unsubscribe = subscribeReservationsForChild(activeChildId, (data) => {
            setReservations(data);
        });

        // Reset form
        setDates([]);
        setWantsSnack(true);
        setSelectedTime("1700");

        const activeChild = childrenData.find(c => c.id === activeChildId);
        if (activeChild?.master.snackConfig?.isExempt) {
            setWantsSnack(false);
        }

        return () => unsubscribe();
    }, [activeChildId, childrenData]);




    // Derived State
    const activeChild = childrenData.find(c => c.id === activeChildId);
    const bookedDates = reservations.map(r => new Date(r.date.replaceAll('-', '/')));

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today && !isAdminViewing) return true;

        return bookedDates.some(booked =>
            booked.getFullYear() === date.getFullYear() &&
            booked.getMonth() === date.getMonth() &&
            booked.getDate() === date.getDate()
        );
    };

    const isSnackExempt = activeChild?.master.snackConfig?.isExempt || false;

    // Fee Calculation — snack only (base is 0 due to town subsidy)
    const daysCount = dates?.length || 0;
    const effectiveWantsSnack = isSnackExempt ? false : wantsSnack;
    const snackFeePerDay = effectiveWantsSnack ? 100 : 0;
    const totalDailyFee = snackFeePerDay;
    const totalEstimatedFee = totalDailyFee * daysCount;

    const handleReserve = async () => {
        if (!activeChildId || !dates || dates.length === 0) {
            alert("日付を選択してください。");
            return;
        }

        setIsSubmitting(true);
        try {
            // Map selected time to label
            const timeLabelMap: Record<string, string> = {
                "1700": "15:00-17:00",
                "1730": "15:00-17:30",
                "1800": "15:00-18:00",
                "1830": "15:00-18:30",
            };
            const timeLabel = timeLabelMap[selectedTime] || "15:00-17:00";

            const dayFee = snackFeePerDay;

            await submitReservations(activeChildId, dates, timeLabel, {
                fee: dayFee,
                hasSnack: effectiveWantsSnack
            });

            alert(`${daysCount}件の予約リクエストを送信しました。\n予定利用料: ${totalEstimatedFee}円`);
            setDates([]);
        } catch (error: any) {
            console.error(error);
            if (error.code === 'permission-denied') {
                alert("予約の送信権限がありません。ログインし直すか、管理者にお問い合わせください。 (Code: PD)");
            } else {
                alert("予約に失敗しました。通信環境を確認してください。");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!selectedReservation) return;

        const todayStr = new Date().toISOString().split('T')[0];
        if (selectedReservation.date < todayStr && !isAdminViewing) {
            alert("過去の予約は取り消せません。");
            return;
        }

        if (!confirm("本当にこの予約を取り消しますか？")) return;

        try {
            await cancelReservation(selectedReservation.id);
            alert("予約を取り消しました。");
            setIsDialogOpen(false);
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
        setDates(newDates);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <span className="animate-pulse text-blue-500 text-sm">Loading...</span>
            </div>
        );
    }

    if (childrenData.length === 0) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <p className="text-orange-800 font-bold">登録されている児童が見つかりません。</p>
                    <p className="text-sm text-orange-700 mt-1">施設から配布されたメールアドレスでログインしているか確認してください。登録がまだの場合は職員にお伝えください。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            {isAdminViewing && (
                <div className="bg-red-50 border border-red-200 p-3 mx-2 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                    <p className="text-xs font-bold text-red-700">管理者モードとして閲覧・予約代行中</p>
                </div>
            )}
            <div className="px-2 space-y-2">
                <h2 className="text-xl font-bold">利用予約</h2>

                {/* Child Selector */}
                {childrenData.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
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
                {/* Selected Child Indicator (Single child case or just info) */}
                {childrenData.length === 1 && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${childrenData[0].colorTheme.badge}`}>
                        <User className="w-4 h-4" />
                        {childrenData[0].master.name}
                    </div>
                )}
            </div>

            {/* Main Content Area - Depends on Active Child */}
            {activeChild && (
                <>
                    <Card className={`border-t-4 ${activeChild.colorTheme.border.replace('border', 'border-t')}`}>
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
                                    locale={ja}
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
                                            color: "#ef4444"
                                        }
                                    }}
                                />
                            </div>

                            {/* Booking Form */}
                            {daysCount > 0 && (
                                <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className={`p-4 rounded-lg space-y-2 ${activeChild.colorTheme.light} ${activeChild.colorTheme.text}`}>
                                        <div className="flex justify-between items-center text-sm">
                                            <span>選択日数:</span>
                                            <span className="font-bold">{daysCount} 日</span>
                                        </div>
                                        <div className="flex justify-between items-center font-bold text-lg border-t border-gray-200/20 pt-2 mt-1">
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
                                                <SelectItem value="1700">通常 (15:00-17:00)</SelectItem>
                                                <SelectItem value="1730">15:00-17:30</SelectItem>
                                                <SelectItem value="1800">15:00-18:00</SelectItem>
                                                <SelectItem value="1830">15:00-18:30</SelectItem>
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

                                    <Button className={`w-full font-bold ${activeChild.colorTheme.bg} hover:opacity-90`} onClick={handleReserve} disabled={isSubmitting}>
                                        {isSubmitting ? <span className="mr-2">...</span> : "予約リクエストを送信"}
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
                                {reservations.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">予約はありません</div>
                                ) : (
                                    reservations.map((res) => (
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
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

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

export default function ParentReservePage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <span className="animate-pulse text-blue-500 text-sm">Loading...</span>
            </div>
        }>
            <ParentReserveContent />
        </Suspense>
    );
}
