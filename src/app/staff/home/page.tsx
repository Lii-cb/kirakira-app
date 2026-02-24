"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    LogOut, Clock, Coffee, LogIn, Calendar,
    Wallet, History, FileText, ChevronRight, User,
    CheckCircle2, AlertCircle, Sparkles
} from "lucide-react";
import {
    subscribeStaffDaily, updateStaffStatus, getStaffDailyRecordsForMonth,
    getStaffMemo, updateStaffMemo, getSystemSettings
} from "@/lib/firestore";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { StaffState, StaffUser, SystemSettings } from "@/types/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { ja } from "date-fns/locale";
import { APP_VERSION } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";

function StaffHomeContent() {
    const [staffInfo, setStaffInfo] = useState<StaffUser | null>(null);
    const [todayState, setTodayState] = useState<StaffState | null>(null);
    const [monthlyRecords, setMonthlyRecords] = useState<{ date: string, state: StaffState }[]>([]);
    const [loading, setLoading] = useState(true);
    const [memo, setMemo] = useState("");
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const router = useRouter();

    const todayStr = useMemo(() => new Date().toLocaleDateString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-'), []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/parent/login");
                return;
            }

            try {
                const staffId = user.email!.replace(/[.#$[\]]/g, "_");
                const staffDoc = await getDoc(doc(db, "staff_users", staffId));

                if (!staffDoc.exists()) {
                    alert("職員権限がありません。");
                    router.push("/parent/home");
                    return;
                }

                const sData = { id: staffDoc.id, ...staffDoc.data() } as StaffUser;
                setStaffInfo(sData);

                // Fetch Monthly History for Salary
                const currentMonth = todayStr.substring(0, 7); // YYYY-MM
                const monthHistory = await getStaffDailyRecordsForMonth(currentMonth);
                const myHistory = monthHistory.map(day => ({
                    date: day.date,
                    state: day.list.find(s => s.id === staffId || s.name === sData.name) // Fallback to name match for legacy
                })).filter(h => h.state !== undefined) as { date: string, state: StaffState }[];
                setMonthlyRecords(myHistory);

                // Load Daily Memo
                const m = await getStaffMemo(todayStr);
                setMemo(m);

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router, todayStr]);

    // REAL-TIME: Today's Status
    useEffect(() => {
        if (!staffInfo) return;
        const unsubscribe = subscribeStaffDaily(todayStr, (list) => {
            const found = list.find(s => s.id === staffInfo.id || s.name === staffInfo.name);
            setTodayState(found || null);
        });
        return () => unsubscribe();
    }, [staffInfo, todayStr]);

    // Handlers
    const handleAction = async (newStatus: StaffState["status"]) => {
        if (!staffInfo) return;
        const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        const newState: StaffState = {
            ...(todayState || { id: staffInfo.id, name: staffInfo.name, time: '--:--', status: 'planned' }),
            status: newStatus,
        };

        if (newStatus === "work") {
            newState.actualTime = now;
            newState.time = now;
        } else if (newStatus === "left") {
            newState.actualEndTime = now;
            newState.time = now;
        } else if (newStatus === "temp_out") {
            newState.time = now;
        }

        await updateStaffStatus(todayStr, newState);
    };

    const handleSaveMemo = async () => {
        if (!staffInfo) return;
        setSaveStatus("saving");
        await updateStaffMemo(todayStr, memo, staffInfo.name);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
    };

    const handleLogout = () => { auth.signOut(); router.push("/"); };

    // Salary Calculation
    const salaryData = useMemo(() => {
        const rate = staffInfo?.hourlyRate || 0;
        let totalMinutes = 0;
        let daysWorked = 0;

        monthlyRecords.forEach(rec => {
            if (rec.state.actualTime && rec.state.actualEndTime) {
                const [startH, startM] = rec.state.actualTime.split(':').map(Number);
                const [endH, endM] = rec.state.actualEndTime.split(':').map(Number);
                const diff = (endH * 60 + endM) - (startH * 60 + startM);
                if (diff > 0) {
                    totalMinutes += diff;
                    daysWorked++;
                }
            }
        });

        const hours = totalMinutes / 60;
        return {
            estimated: Math.floor(hours * rate),
            hours: hours.toFixed(1),
            days: daysWorked
        };
    }, [monthlyRecords, staffInfo]);

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono">STAFF_PORTAL_LOADING...</div>;

    const statusObj = {
        work: { label: "勤務中", color: "bg-green-500", icon: Clock },
        temp_out: { label: "外出中", color: "bg-amber-500", icon: Coffee },
        left: { label: "退勤済", color: "bg-slate-500", icon: LogOut },
        absent: { label: "欠勤", color: "bg-red-500", icon: AlertCircle },
        planned: { label: "出勤前", color: "bg-blue-400", icon: Calendar }
    }[todayState?.status || "planned"];

    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-10">
            {/* Dark Header */}
            <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg shadow-inner"><LogIn className="h-5 w-5" /></div>
                    <div>
                        <h1 className="font-bold tracking-tight">Staff Portal</h1>
                        <p className="text-[10px] text-slate-400 font-mono leading-none">{APP_VERSION} / {staffInfo?.role.toUpperCase()}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-slate-800"><LogOut className="h-5 w-5" /></Button>
            </header>

            <main className="p-4 max-w-2xl mx-auto space-y-6">
                {/* 1. Status Hero Section */}
                <Card className="border-none shadow-xl bg-white overflow-hidden">
                    <div className={`h-1.5 ${statusObj.color}`} />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 border-4 border-slate-50 shadow-sm">
                                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xl font-bold">{staffInfo?.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Currently</p>
                                    <h2 className={`text-2xl font-black flex items-center gap-2`}>
                                        <statusObj.icon className={`h-6 w-6 ${todayState?.status === 'work' ? 'animate-pulse' : ''}`} />
                                        {statusObj.label}
                                    </h2>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Date</p>
                                <p className="font-mono font-bold text-slate-700">{todayStr.replaceAll('-', '/')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Start Time / 出勤時刻</span>
                                <span className="text-2xl font-mono font-black text-slate-800">{todayState?.actualTime || "--:--"}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">End Time / 退勤時刻</span>
                                <span className="text-2xl font-mono font-black text-slate-800">{todayState?.actualEndTime || "--:--"}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                className="flex-1 min-w-[120px] h-12 rounded-xl bg-green-600 hover:bg-green-700 shadow-lg text-white font-bold"
                                onClick={() => handleAction("work")}
                                disabled={todayState?.status === "work"}
                            >
                                <LogIn className="mr-2 h-5 w-5" /> 出勤
                            </Button>
                            <Button
                                className="flex-1 min-w-[120px] h-12 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg text-white font-bold"
                                onClick={() => handleAction("temp_out")}
                                disabled={todayState?.status !== "work"}
                            >
                                <Coffee className="mr-2 h-5 w-5" /> 外出
                            </Button>
                            <Button
                                className="flex-1 min-w-[120px] h-12 rounded-xl bg-slate-800 hover:bg-slate-900 shadow-lg text-white font-bold"
                                onClick={() => handleAction("left")}
                                disabled={todayState?.status !== "work" && todayState?.status !== "temp_out"}
                            >
                                <LogOut className="mr-2 h-5 w-5" /> 退勤
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Salary & Metrics Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-tighter opacity-80 flex items-center gap-2">
                                <Wallet className="h-4 w-4" /> Estimated Salary / 概算給与
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black">¥{salaryData.estimated.toLocaleString()}</span>
                                <span className="text-xs opacity-60">月間実績</span>
                            </div>
                            <div className="mt-4 flex gap-4 text-[10px] font-bold">
                                <div className="bg-white/10 px-2 py-1 rounded">HOURS: {salaryData.hours}h</div>
                                <div className="bg-white/10 px-2 py-1 rounded">DAYS: {salaryData.days}d</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Shift Info / シフト情報
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-600 font-bold">本日の予定: <span className="text-slate-900 font-black">{todayState?.shiftTime || "未定"}</span></p>
                                <p className="text-xs text-slate-400 italic">※変更がある場合は管理者へ連絡してください</p>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Badge variant="secondary" className="text-[9px] bg-slate-100">時給 ¥{staffInfo?.hourlyRate?.toLocaleString() || "---"}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Daily Memo / Report */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" /> Daily Report / 日報メモ
                            </CardTitle>
                            <CardDescription className="text-[10px]">当日の共有事項や気づきを記入してください</CardDescription>
                        </div>
                        {saveStatus !== "idle" && (
                            <Badge variant="outline" className={`text-[10px] ${saveStatus === 'saved' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600'}`}>
                                {saveStatus === 'saving' ? '保存中...' : '保存完了'}
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <Textarea
                            placeholder="児童の様子や清掃、連絡事項など..."
                            className="min-h-[150px] bg-slate-50 border-slate-100 rounded-xl focus:ring-slate-200 transition-all text-sm leading-relaxed"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                        <Button className="w-full bg-slate-800 hover:bg-slate-900 text-xs font-bold h-10 shadow-lg" onClick={handleSaveMemo}>
                            日報を保存する
                        </Button>
                    </CardContent>
                </Card>

                {/* 4. Navigation Links */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/admin/calendar" className="block">
                        <Button variant="outline" className="w-full justify-between h-12 px-4 text-xs font-bold border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all group">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> 予約カレンダー</span>
                            <ChevronRight className="h-3 w-3 opacity-30 group-hover:opacity-100" />
                        </Button>
                    </Link>
                    <Link href="/parent/home" className="block">
                        <Button variant="outline" className="w-full justify-between h-12 px-4 text-xs font-bold border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all group">
                            <span className="flex items-center gap-2"><User className="h-4 w-4" /> 児童マイページ</span>
                            <ChevronRight className="h-3 w-3 opacity-30 group-hover:opacity-100" />
                        </Button>
                    </Link>
                </div>

                <div className="text-center pt-6 opacity-30 select-none pointer-events-none">
                    <Sparkles className="h-6 w-6 mx-auto mb-2 text-indigo-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Premium Management System</p>
                </div>
            </main>
        </div>
    );
}

export default function StaffHomePage() {
    return <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-mono">LOADING...</div>}><StaffHomeContent /></Suspense>;
}
