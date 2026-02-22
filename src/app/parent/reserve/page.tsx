"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { submitReservations, getReservationsForChild, cancelReservation } from "@/lib/firestore";
import { Reservation, Child } from "@/types/firestore";
import { Trash2, Cookie, User } from "lucide-react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ja } from "date-fns/locale";
import { SIBLING_COLORS } from "@/lib/constants";
import { ChildData } from "@/types/firestore";


export default function ParentReservePage() {
    const [childrenData, setChildrenData] = useState<ChildData[]>([]);
    const [activeChildId, setActiveChildId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [dates, setDates] = useState<Date[] | undefined>([]);
    const [selectedTime, setSelectedTime] = useState("1700");
    const [wantsSnack, setWantsSnack] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    // Dialog State
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Initial Data Fetch (Auth & Children)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/parent/login");
                return;
            }

            try {
                // 1. Fetch Child IDs linked to Parent
                let targetChildIds: string[] = [];
                const parentQuery = query(collection(db, "parents"), where("email", "==", user.email));
                const parentSnapshot = await getDocs(parentQuery);

                if (!parentSnapshot.empty) {
                    const parentData = parentSnapshot.docs[0].data();
                    targetChildIds = parentData.childIds || [];
                } else {
                    // Fallback
                    const q = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
                    const snapshot = await getDocs(q);
                    targetChildIds = snapshot.docs.map(d => d.id);
                }

                if (targetChildIds.length === 0) {
                    // Fallback 2
                    const q = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
                    const snapshot = await getDocs(q);
                    const directIds = snapshot.docs.map(d => d.id);
                    targetChildIds = Array.from(new Set([...targetChildIds, ...directIds]));
                }

                if (targetChildIds.length === 0) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch Child Details
                const childrenPromises = targetChildIds.map(async (id, index) => {
                    const d = await getDoc(doc(db, "children", id));
                    if (d.exists()) {
                        return {
                            id: d.id,
                            master: d.data() as Child,
                            colorTheme: SIBLING_COLORS[index % SIBLING_COLORS.length]
                        };
                    }
                    return null;
                });

                const loadedChildren = (await Promise.all(childrenPromises)).filter((c): c is ChildData => c !== null);
                setChildrenData(loadedChildren);

                if (loadedChildren.length > 0) {
                    setActiveChildId(loadedChildren[0].id);
                }
                setLoading(false);

            } catch (err) {
                console.error("Error fetching children:", err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    // Fetch Reservations when Active Child Changes
    useEffect(() => {
        if (!activeChildId) return;

        const loadData = async () => {
            const resData = await getReservationsForChild(activeChildId);
            setReservations(resData);

            // Reset form
            setDates([]);
            setWantsSnack(true);
            setSelectedTime("1700");

            const activeChild = childrenData.find(c => c.id === activeChildId);
            if (activeChild?.master.snackConfig?.isExempt) {
                setWantsSnack(false);
            }
        };
        loadData();
    }, [activeChildId, childrenData]);


    const fetchHistory = async () => {
        if (!activeChildId) return;
        const data = await getReservationsForChild(activeChildId);
        setReservations(data);
    };

    // Derived State
    const activeChild = childrenData.find(c => c.id === activeChildId);
    const bookedDates = reservations.map(r => new Date(r.date.replaceAll('-', '/')));

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return true;

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

        const todayStr = new Date().toISOString().split('T')[0];
        if (selectedReservation.date < todayStr) {
            alert("過去の予約は取り消せません。");
            return;
        }

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
            <div className="p-4 text-center">
                <p>登録されている児童が見つかりません。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
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
