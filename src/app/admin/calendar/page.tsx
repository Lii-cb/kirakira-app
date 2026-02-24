"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Printer, Plus } from "lucide-react";
import { getReservations, updateReservationStatus, getChildren, submitReservations, bulkUpdateReservationStatus } from "@/lib/firestore";
import { Reservation, Child, StaffState } from "@/types/firestore";
import { ja } from "date-fns/locale";
import { Spinner } from "@/components/ui/spinner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Input } from "@/components/ui/input";

export default function AdminCalendarPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [reservations, setReservations] = React.useState<Reservation[]>([]);
    const [staffAttendance, setStaffAttendance] = React.useState<StaffState[]>([]);
    const [children, setChildren] = React.useState<Map<string, Child>>(new Map());
    const [loading, setLoading] = React.useState(false);

    // New reservation dialog state
    const [showNewReservation, setShowNewReservation] = React.useState(false);
    const [selectedChildId, setSelectedChildId] = React.useState("");
    const [selectedTime, setSelectedTime] = React.useState("14:00-17:00");
    const [submitting, setSubmitting] = React.useState(false);

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

    const dateStr = React.useMemo(() => date ? date.toLocaleDateString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-') : "", [date]);

    // Subscriptions
    React.useEffect(() => {
        if (!dateStr) return;
        setLoading(true);

        // Reservations Sub
        const qRes = query(collection(db, "reservations"), where("date", "==", dateStr));
        const unsubRes = onSnapshot(qRes, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
            setReservations(data);
            setLoading(false);
        });

        // Staff Attendance Sub
        const docRefStaff = doc(db, "staff_daily", dateStr);
        const unsubStaff = onSnapshot(docRefStaff, (snap) => {
            if (snap.exists()) {
                setStaffAttendance(snap.data().list || []);
            } else {
                setStaffAttendance([]);
            }
        });

        return () => {
            unsubRes();
            unsubStaff();
        };
    }, [dateStr]);

    const handleStatusUpdate = async (id: string, status: "confirmed" | "rejected") => {
        try {
            await updateReservationStatus(id, status);
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleBulkApprove = async () => {
        const pendingIds = reservations.filter(r => r.status === "pending").map(r => r.id);
        if (pendingIds.length === 0) return;
        if (!confirm(`${pendingIds.length}件の予約を一括承認しますか？`)) return;
        try {
            await bulkUpdateReservationStatus(pendingIds, "confirmed");
            alert("一括承認が完了しました。");
        } catch (error) {
            console.error(error);
            alert("一括承認に失敗しました。");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleNewReservation = async () => {
        if (!selectedChildId || !date) return;
        setSubmitting(true);
        try {
            await submitReservations(selectedChildId, [date], selectedTime, { fee: 0, hasSnack: false });
            setShowNewReservation(false);
            setSelectedChildId("");
            setSelectedTime("14:00-17:00");
        } catch (error) {
            console.error("Failed to add reservation", error);
            alert("予約の追加に失敗しました。");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmedCount = reservations.filter(r => r.status === "confirmed").length;
    const pendingCount = reservations.filter(r => r.status === "pending").length;
    const staffCount = staffAttendance.filter(s => s.status === "work" || s.status === "temp_out").length;

    // Sort children for select dropdown
    const sortedChildren = Array.from(children.values()).sort((a, b) =>
        (a.grade || 0) - (b.grade || 0) || a.name.localeCompare(b.name)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">予約台帳</h2>
                    <p className="text-muted-foreground">日ごとの予約状況と職員の出勤状況を管理します。</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        詳細リスト印刷
                    </Button>
                    <Button onClick={() => setShowNewReservation(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        新規予約登録
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[400px_1fr]">
                <Card className="print:hidden h-fit">
                    <CardHeader>
                        <CardTitle>カレンダー</CardTitle>
                        <CardDescription>日付を選択して詳細を確認</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            locale={ja}
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border p-4 shadow-sm"
                        />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="flex flex-col">
                        <CardHeader className="border-b bg-slate-50/50">
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
                                <div className="space-y-8">
                                    {/* Summary Metrics */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="border-2 border-indigo-50 rounded-xl p-4 text-center bg-indigo-50/30">
                                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">Confirmed / 予約確定</div>
                                            <div className="text-3xl font-black flex items-center justify-center gap-2 text-indigo-700">
                                                <Users className="h-6 w-6" />
                                                {confirmedCount}
                                            </div>
                                        </div>
                                        <div className="border-2 border-amber-100 rounded-xl p-4 text-center bg-amber-50/50">
                                            <div className="text-amber-800/60 text-[10px] font-black uppercase mb-1">Pending / 未承認</div>
                                            <div className="text-3xl font-black text-amber-600 mb-1">{pendingCount}</div>
                                            {pendingCount > 0 && (
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold bg-white border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleBulkApprove}>一括承認</Button>
                                            )}
                                        </div>
                                        <div className="border-2 border-green-50 rounded-xl p-4 text-center bg-green-50/30">
                                            <div className="text-green-800/60 text-[10px] font-black uppercase mb-1">Staff / 出勤職員</div>
                                            <div className="text-3xl font-black text-green-700">{staffCount}</div>
                                        </div>
                                    </div>

                                    {/* Daily Reservation List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 font-bold text-slate-800"><Users className="h-5 w-5 text-indigo-500" /> 児童予約リスト</div>
                                        <div className="border rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 border-b">
                                                    <tr>
                                                        <th className="p-3 font-bold uppercase text-[10px]">児童名</th>
                                                        <th className="p-3 font-bold uppercase text-[10px]">クラス</th>
                                                        <th className="p-3 font-bold uppercase text-[10px]">希望時間</th>
                                                        <th className="p-3 font-bold uppercase text-[10px]">状態</th>
                                                        <th className="p-3 font-bold uppercase text-[10px] text-right print:hidden">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {loading ? (
                                                        <tr><td colSpan={5} className="p-10 text-center"><Spinner /></td></tr>
                                                    ) : reservations.length === 0 ? (
                                                        <tr><td colSpan={5} className="p-10 text-center text-slate-400">予約はありません</td></tr>
                                                    ) : (
                                                        reservations.map(res => {
                                                            const child = children.get(res.childId.trim());
                                                            const displayName = child?.name || (child as any)?.fullName || (child as any)?.氏名 || (res as any).childName || "不明な児童";
                                                            return (
                                                                <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="p-3 font-bold text-slate-700">{displayName}</td>
                                                                    <td className="p-3 text-slate-500 font-medium">{child ? `${child.grade}年` : "-"}</td>
                                                                    <td className="p-3 font-mono">{res.time}</td>
                                                                    <td className="p-3">
                                                                        {res.status === "pending" ? (
                                                                            <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">承認待ち</Badge>
                                                                        ) : res.status === "confirmed" ? (
                                                                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-none text-[10px]">確定済</Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-[10px]">却下</Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-right print:hidden">
                                                                        {res.status === "pending" && (
                                                                            <div className="flex justify-end gap-2">
                                                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 h-8 px-2" onClick={() => handleStatusUpdate(res.id, "rejected")}>却下</Button>
                                                                                <Button size="sm" className="h-8 px-3 bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(res.id, "confirmed")}>承認</Button>
                                                                            </div>
                                                                        )}
                                                                        {res.status === "confirmed" && (
                                                                            <Button size="sm" variant="ghost" className="text-slate-400 h-8" onClick={() => handleStatusUpdate(res.id, "rejected")}>取消</Button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Staff List Integration */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 font-bold text-slate-800"><Users className="h-5 w-5 text-green-500" /> 出勤職員リスト</div>
                                        <div className="border rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 border-b">
                                                    <tr>
                                                        <th className="p-3 font-bold uppercase text-[10px]">名前</th>
                                                        <th className="p-3 font-bold uppercase text-[10px]">状態</th>
                                                        <th className="p-3 font-bold uppercase text-[10px]">予定時間</th>
                                                        <th className="p-3 font-bold uppercase text-[10px]">実績</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {staffAttendance.length === 0 ? (
                                                        <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">職員の出勤予定はありません</td></tr>
                                                    ) : (
                                                        staffAttendance.map(staff => (
                                                            <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="p-3 font-bold text-slate-700">{staff.name}</td>
                                                                <td className="p-3">
                                                                    <Badge className={`text-[10px] border-none ${staff.status === 'work' ? 'bg-green-500' :
                                                                        staff.status === 'left' ? 'bg-slate-400' :
                                                                            staff.status === 'temp_out' ? 'bg-amber-500' : 'bg-slate-200 text-slate-600'
                                                                        }`}>
                                                                        {staff.status === 'work' ? '勤務中' : staff.status === 'left' ? '帰宅済' : staff.status === 'temp_out' ? '外出中' : '予定'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 font-mono text-slate-500">{staff.shiftTime || "--:--"}</td>
                                                                <td className="p-3 font-mono text-slate-700">
                                                                    {staff.actualTime ? `${staff.actualTime} 〜 ${staff.actualEndTime || "---"}` : "---"}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-20 text-center text-slate-300 italic">日付を選択してください</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* New Reservation Dialog */}
            <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
                <DialogContent>
                    <DialogHeader><DialogTitle>新規予約登録</DialogTitle><DialogDescription>管理者が代理で予約を登録します。</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">児童</label>
                            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                                <SelectTrigger><SelectValue placeholder="児童を選択" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {Array.from(children.values()).sort((a, b) => (a.grade || 0) - (b.grade || 0) || a.name.localeCompare(b.name)).map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.grade}年: {c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">時間</label>
                            <Input value={selectedTime} onChange={e => setSelectedTime(e.target.value)} placeholder="14:00-17:00" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewReservation(false)}>キャンセル</Button>
                        <Button onClick={handleNewReservation} disabled={!selectedChildId || submitting}>
                            {submitting ? <Spinner /> : "予約を追加"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
