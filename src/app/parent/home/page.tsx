"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    LogOut, MessageCircle, AlertTriangle, Home as HomeIcon, Clock, Moon,
    Calendar as CalendarIcon, User, ShieldCheck, ArrowLeft, ArrowRight,
    Wallet, History, Receipt, Trash2, Edit2, PlusCircle, Info, MessageSquare
} from "lucide-react";
import {
    subscribeTodayAttendance, updateAttendanceStatus, getDocuments,
    subscribeReservationsForChild, getPaymentsForChild, getSystemSettings,
    cancelReservation, submitReservations
} from "@/lib/firestore";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { AttendanceRecord, Child, AppDocument, Reservation, Payment, SystemSettings } from "@/types/firestore";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ja } from "date-fns/locale";
import { SIBLING_COLORS, APP_VERSION } from "@/lib/constants";
import { ChildData } from "@/types/firestore";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CalendarMode = "view" | "reserve" | "change" | "news";

function ParentHomeContent() {
    const [childrenData, setChildrenData] = useState<ChildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isAdminViewing, setIsAdminViewing] = useState(false);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetChildIdParam = searchParams.get("childId");

    // Unified State
    const [allReservations, setAllReservations] = useState<Record<string, Reservation[]>>({});
    const [allPayments, setAllPayments] = useState<Record<string, Payment[]>>({});
    const [events, setEvents] = useState<AppDocument[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [calMode, setCalMode] = useState<CalendarMode>("view");
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);

    // Dialog & UI State
    const [activeChildId, setActiveChildId] = useState<string | null>(null);
    const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
    const [isResDetailOpen, setIsResDetailOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<AppDocument | null>(null);
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

    // Form States
    const [requestMemo, setRequestMemo] = useState("");
    const [returnValue, setReturnValue] = useState("お迎え");
    const [messageInput, setMessageInput] = useState("");
    const [resTime, setResTime] = useState("17:00");
    const [hasSnack, setHasSnack] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pastFixRequest, setPastFixRequest] = useState("");
    const [isPastFixOpen, setIsPastFixOpen] = useState(false);
    const [showMoreRes, setShowMoreRes] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/parent/login");
                return;
            }
            setUserEmail(user.email);

            try {
                // Fetch Settings
                const s = await getSystemSettings();
                setSettings(s);

                let targetChildIds: string[] = [];
                let adminMode = false;

                if (targetChildIdParam) {
                    const staffId = user.email!.replace(/[.#$[\]]/g, "_");
                    const staffDoc = await getDoc(doc(db, "staff_users", staffId));
                    if (staffDoc.exists() && staffDoc.data().role === "admin") {
                        const childDoc = await getDoc(doc(db, "children", targetChildIdParam));
                        if (childDoc.exists()) {
                            targetChildIds = [targetChildIdParam];
                            adminMode = true;
                            setIsAdminViewing(true);
                        }
                    }
                }

                if (!adminMode) {
                    const parentQuery = query(collection(db, "parents"), where("email", "==", user.email));
                    const parentSnapshot = await getDocs(parentQuery);
                    if (!parentSnapshot.empty) {
                        targetChildIds = parentSnapshot.docs[0].data().childIds || [];
                    } else {
                        const q = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
                        const snapshot = await getDocs(q);
                        targetChildIds = snapshot.docs.map(d => d.id);
                    }
                }

                if (targetChildIds.length === 0) {
                    alert("児童が見つかりません。");
                    setLoading(false);
                    return;
                }

                const childrenPromises = targetChildIds.map(async (id, index) => {
                    const d = await getDoc(doc(db, "children", id));
                    if (d.exists()) {
                        return {
                            id: d.id,
                            master: d.data() as Child,
                            attendance: null,
                            colorTheme: SIBLING_COLORS[index % SIBLING_COLORS.length]
                        };
                    }
                    return null;
                });

                const loadedChildren = (await Promise.all(childrenPromises)).filter(c => c !== null).map(c => {
                    if (c && c.master && !c.master.name && (c.master as any).fullName) {
                        c.master.name = (c.master as any).fullName;
                    }
                    return c;
                }) as ChildData[];
                setChildrenData(loadedChildren);

                // Fetch Events
                const docs = await getDocuments();
                setEvents(docs.filter(d => d.category === "event" && d.eventDate));

                // Fetch Initial Payments
                const payPromises = targetChildIds.map(async id => ({ id, data: await getPaymentsForChild(id) }));
                const allPay = await Promise.all(payPromises);
                const payMap: Record<string, Payment[]> = {};
                allPay.forEach(p => payMap[p.id] = p.data);
                setAllPayments(payMap);

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router, targetChildIdParam]);

    // Subscriptions
    useEffect(() => {
        if (childrenData.length === 0) return;
        const today = new Date().toISOString().split('T')[0];

        // Attendance Sub
        const unsubAttendance = subscribeTodayAttendance(today, (records) => {
            setChildrenData(prev => prev.map(child => ({
                ...child,
                attendance: records.find(r => r.childId === child.id) || null
            })));
        });

        // Reservations Subs
        const unsubRes = childrenData.map(child =>
            subscribeReservationsForChild(child.id, (res) => {
                setAllReservations(prev => ({ ...prev, [child.id]: res }));
            })
        );

        return () => {
            unsubAttendance();
            unsubRes.forEach(u => u());
        };
    }, [childrenData.length]);

    // Calculations
    const childCalculations = useMemo(() => {
        const results: Record<string, { balance: number, totalUsed: number }> = {};
        childrenData.forEach(child => {
            const payments = allPayments[child.id] || [];
            const reservations = allReservations[child.id] || [];
            const isExempt = child.master.snackConfig?.isExempt;

            const totalDeposited = payments.filter(p => p.status === "confirmed").reduce((sum, p) => sum + p.amount, 0);
            const confirmedReservations = reservations.filter(r => r.status === "confirmed");
            const totalUsed = confirmedReservations.reduce((sum, r) => {
                const fee = r.fee || 0;
                const snack = (r.hasSnack && !isExempt) ? 100 : 0;
                return sum + fee + snack;
            }, 0);

            results[child.id] = {
                balance: totalDeposited - totalUsed,
                totalUsed
            };
        });
        return results;
    }, [childrenData, allPayments, allReservations]);

    // Unified Logic
    const handleReserveSubmit = async () => {
        if (selectedDates.length === 0 || !activeChildId) {
            alert("日付を選択してください。");
            return;
        }
        setIsSubmitting(true);
        try {
            await submitReservations(activeChildId, selectedDates, resTime, {
                fee: hasSnack ? 100 : 0,
                hasSnack: hasSnack
            });
            alert(`${selectedDates.length}件の予約リクエストを送信しました。`);
            setSelectedDates([]);
            setCalMode("view");
        } catch (error) {
            console.error(error);
            alert("予約に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResClick = (res: Reservation) => {
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedRes(res);
        if (res.date < todayStr && !isAdminViewing) {
            setIsPastFixOpen(true);
        } else {
            setIsResDetailOpen(true);
        }
    };

    const handlePastFixSubmit = async () => {
        if (!selectedRes || !pastFixRequest.trim()) return;
        setIsSubmitting(true);
        try {
            // Send as a message to staff or a khusus request. 
            // For now, let's add to attendance messages if exists, or just alert.
            // Ideally we'd have a 'correction_request' type.
            const newMessage = {
                id: `fix-${Date.now()}`,
                sender: 'parent' as const,
                senderName: "保護者",
                content: `【修正希望】${selectedRes.date}の予約について: ${pastFixRequest}`,
                timestamp: new Date().toISOString()
            };
            await updateAttendanceStatus(selectedRes.childId, selectedRes.date, {
                messages: [...(allReservations[selectedRes.childId]?.find(r => r.id === selectedRes.id) ? [] : []), newMessage]
            });
            alert("修正希望を送信しました。");
            setIsPastFixOpen(false);
            setPastFixRequest("");
        } catch (error) {
            console.error(error);
            alert("送信に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const activeChild = childrenData.find(c => c.id === activeChildId);
        if (activeChild?.master.snackConfig?.isExempt) {
            setHasSnack(false);
        } else {
            setHasSnack(true);
        }
    }, [activeChildId, childrenData]);

    // Handlers
    const handleLogout = () => { auth.signOut(); router.push("/"); };

    const openAbsenceDialog = (id: string) => { setActiveChildId(id); setIsAbsenceOpen(true); };
    const openReturnDialog = (id: string) => { setActiveChildId(id); setIsReturnOpen(true); };
    const openMessageDialog = (id: string) => { setActiveChildId(id); setIsMessageOpen(true); };

    const handleAbsence = async () => {
        if (!activeChildId) return;
        await updateAttendanceStatus(activeChildId, new Date().toISOString().split('T')[0], { status: "absent", memo: requestMemo });
        setIsAbsenceOpen(false); setRequestMemo("");
    };

    const handleReturnChange = async () => {
        if (!activeChildId) return;
        await updateAttendanceStatus(activeChildId, new Date().toISOString().split('T')[0], { returnMethod: returnValue, memo: requestMemo });
        setIsReturnOpen(false); setRequestMemo("");
    };

    const handleSendMessage = async () => {
        if (!activeChildId || !messageInput.trim()) return;
        const child = childrenData.find(c => c.id === activeChildId);
        if (!child) return;
        const newMessage = { id: `msg-${Date.now()}`, sender: 'parent' as const, senderName: "保護者", content: messageInput, timestamp: new Date().toISOString() };
        await updateAttendanceStatus(activeChildId, new Date().toISOString().split('T')[0], { messages: [...(child.attendance?.messages || []), newMessage] });
        setMessageInput("");
    };

    const handleCancelRes = async () => {
        if (!selectedRes) return;
        if (!confirm("予約を取り消しますか？")) return;
        await cancelReservation(selectedRes.id);
        setIsResDetailOpen(false);
    };

    // Chat Link Logic
    const chatUrl = settings?.notifications?.staffChatUrl || (settings?.notifications?.chatEmail ? `https://chat.google.com/dm/${settings.notifications.chatEmail}` : "https://chat.google.com/");

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">読み込み中...</div>;

    const getEventsForDate = (day: Date) => events.filter(e => e.eventDate === day.toISOString().split('T')[0]);
    const getResForDate = (day: Date) => {
        const dateStr = day.toISOString().split('T')[0];
        const resList: { child: ChildData, res: Reservation }[] = [];
        childrenData.forEach(child => {
            const found = allReservations[child.id]?.find(r => r.date === dateStr);
            if (found) resList.push({ child, res: found });
        });
        return resList;
    };

    const selectedEvents = date ? getEventsForDate(date) : [];
    const selectedDateRes = date ? getResForDate(date) : [];

    // Calendar Modifiers
    const modifiers = {
        closed: (date: Date) => date.getDay() === 0,
        confirmed: (date: Date) => {
            const dateStr = date.toISOString().split('T')[0];
            return childrenData.some(child =>
                allReservations[child.id]?.some(r => r.date === dateStr && r.status === "confirmed")
            );
        },
        pending: (date: Date) => {
            const dateStr = date.toISOString().split('T')[0];
            return childrenData.some(child =>
                allReservations[child.id]?.some(r => r.date === dateStr && r.status === "pending")
            );
        },
        event: (date: Date) => getEventsForDate(date).length > 0
    };

    const modifiersStyles = {
        closed: { color: '#ef4444', fontWeight: 'bold' }, // Red
        confirmed: { backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold' }, // Green
        pending: { backgroundColor: '#dbeafe', color: '#1d4ed8' }, // Blue
        event: { border: '2px solid #000', borderRadius: '4px' } // Boxed
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg"><HomeIcon className="h-5 w-5 text-white" /></div>
                    <span className="font-bold text-gray-800 tracking-tight">きらきらMy Page</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono mr-2">{APP_VERSION}</span>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut className="h-5 w-5" /></Button>
                </div>
            </header>

            {isAdminViewing && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 text-amber-800 font-bold"><ShieldCheck className="h-4 w-4" /><span>管理者モード</span></div>
                    <Link href="/admin/users" className="flex items-center gap-1 text-amber-700 hover:underline">児童名簿に戻る <ArrowRight className="h-3 w-3" /></Link>
                </div>
            )}

            <main className="p-4 max-w-2xl mx-auto space-y-6">
                {/* 1. Integrated Child Status Cards */}
                <div className="grid gap-6">
                    {childrenData.map(child => {
                        const { master, attendance, colorTheme } = child;
                        const status = attendance?.status || "pending";
                        const statusColor = status === "arrived" ? "bg-green-100 text-green-700" : status === "left" ? "bg-gray-100 text-gray-600" : status === "absent" ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-600";
                        const statusLabel = status === "arrived" ? "入室中" : status === "left" ? "帰宅済" : status === "absent" ? "欠席" : "予定";

                        return (
                            <Card key={child.id} className="overflow-hidden border-none shadow-md">
                                <div className={`h-2 ${colorTheme.bg}`} />
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className={`h-12 w-12 border ${colorTheme.border}`}>
                                                <AvatarFallback className={`${colorTheme.light} ${colorTheme.text} font-bold`}>{(master.name || (master as any).fullName || (master as any).氏名 || "?")[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h2 className="font-bold text-lg">{master.name || (master as any).fullName || (master as any).氏名 || "名前なし"}</h2>
                                                <Badge className={`${statusColor} border-none text-[10px] h-5`}>{statusLabel}</Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <a href={chatUrl} target="_blank" rel="noreferrer">
                                                <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-blue-50">
                                                    <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-red-500 border-white" />
                                                    <MessageCircle className="h-5 w-5 text-blue-500" />
                                                </Button>
                                            </a>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-[10px] text-muted-foreground block mb-1">入室時刻</span>
                                            <span className="text-xl font-mono font-bold">{attendance?.arrivalTime || "--:--"}</span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-[10px] text-muted-foreground block mb-1">退室時刻</span>
                                            <span className="text-xl font-mono font-bold">{attendance?.departureTime || "--:--"}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1 text-xs h-9" onClick={() => openAbsenceDialog(child.id)}><AlertTriangle className="w-3 h-3 mr-1 text-red-500" /> 欠席連絡</Button>
                                        <Button variant="outline" className="flex-1 text-xs h-9" onClick={() => openReturnDialog(child.id)}><Moon className="w-3 h-3 mr-1 text-indigo-500" /> 帰宅変更</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* 2. Unified Calendar Section */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b py-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-blue-600" /> カレンダー</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                        {/* Side Navigation for Calendar */}
                        <div className="flex md:flex-col gap-2 shrink-0">
                            <Button
                                variant={calMode === "reserve" ? "default" : "outline"}
                                size="sm"
                                className="flex-1 md:flex-none justify-start px-3 py-2 text-xs"
                                onClick={() => { setCalMode("reserve"); setSelectedDates([]); }}
                            >
                                <PlusCircle className="w-4 h-4 mr-2" /> 予約
                            </Button>
                            <Button
                                variant={calMode === "change" ? "default" : "outline"}
                                size="sm"
                                className="flex-1 md:flex-none justify-start px-3 py-2 text-xs"
                                onClick={() => { setCalMode("change"); setDate(new Date()); }}
                            >
                                <Edit2 className="w-4 h-4 mr-2" /> 変更申請
                            </Button>
                            <Button
                                variant={calMode === "news" ? "default" : "outline"}
                                size="sm"
                                className="flex-1 md:flex-none justify-start px-3 py-2 text-xs"
                                onClick={() => { setCalMode("news"); setDate(new Date()); }}
                            >
                                <Info className="w-4 h-4 mr-2" /> お知らせ
                            </Button>
                            <Button
                                variant={calMode === "view" ? "default" : "outline"}
                                size="sm"
                                className="flex-1 md:flex-none justify-start px-3 py-2 text-xs"
                                onClick={() => { setCalMode("view"); setDate(new Date()); }}
                            >
                                <History className="w-4 h-4 mr-2" /> 閲覧のみ
                            </Button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row gap-6">
                            <div className="flex-1 flex justify-center mb-4 md:mb-0">
                                {calMode === "reserve" ? (
                                    <Calendar
                                        locale={ja}
                                        mode="multiple"
                                        selected={selectedDates}
                                        onSelect={(days) => setSelectedDates(days || [])}
                                        className="rounded-md border p-4 bg-white"
                                        modifiers={modifiers}
                                        modifiersStyles={modifiersStyles}
                                    />
                                ) : (
                                    <Calendar
                                        locale={ja}
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        className="rounded-md border p-4 bg-white"
                                        modifiers={modifiers}
                                        modifiersStyles={modifiersStyles}
                                    />
                                )}
                            </div>

                            {/* Mode-specific detail panels */}
                            <div className="flex-1 space-y-4">
                                {calMode === "reserve" && (
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                                        <h4 className="text-xs font-bold text-blue-800 border-b border-blue-200 pb-1">新規予約リクエスト</h4>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">選択人数: {selectedDates.length}日</Label>
                                            <p className="text-[9px] text-slate-500 leading-tight">カレンダーから複数の日付を選択できます。</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold">終了時間</Label>
                                            <Select value={resTime} onValueChange={setResTime}>
                                                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="17:00">17:00</SelectItem>
                                                    <SelectItem value="17:30">17:30</SelectItem>
                                                    <SelectItem value="18:00">18:00</SelectItem>
                                                    <SelectItem value="18:30">18:30</SelectItem>
                                                    <SelectItem value="19:00">19:00</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="snack" checked={hasSnack} onCheckedChange={(v) => setHasSnack(!!v)} />
                                            <label htmlFor="snack" className="text-[10px] font-bold leading-none cursor-pointer">おやつ (100円)</label>
                                        </div>
                                        <Button
                                            className="w-full h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-sm"
                                            disabled={selectedDates.length === 0 || isSubmitting}
                                            onClick={handleReserveSubmit}
                                        >
                                            {isSubmitting ? "送信中..." : `リクエスト送信 (${selectedDates.length * (hasSnack ? 100 : 0)}円)`}
                                        </Button>
                                    </div>
                                )}

                                {(calMode === "view" || calMode === "change" || calMode === "news") && (
                                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 min-h-[100px]">
                                        <h4 className="text-[10px] font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1 flex justify-between">
                                            <span>{date?.toLocaleDateString()} の詳細</span>
                                            {calMode === "change" && <span className="text-blue-600">変更対象を選択</span>}
                                            {calMode === "news" && <span className="text-orange-600">おたよりを選択</span>}
                                        </h4>
                                        {selectedEvents.length === 0 && selectedDateRes.length === 0 && <p className="text-xs text-slate-400 py-4 text-center italic">この日の予定はありません</p>}

                                        <ul className="space-y-2">
                                            {selectedEvents.map(e => (
                                                <li key={e.id} className="text-xs bg-white p-2 rounded shadow-sm border border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => { setSelectedEvent(e); setIsEventDialogOpen(true); }}>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold flex items-center gap-1"><Badge className="h-4 px-1 text-[8px] bg-blue-500">おたより</Badge> {e.title}</span>
                                                    </div>
                                                    <Info className="h-3 w-3 text-blue-300" />
                                                </li>
                                            ))}
                                            {selectedDateRes.map(({ child, res }) => (
                                                <li key={res.id} className="text-xs bg-white p-2 rounded shadow-sm border border-green-100 flex items-center justify-between cursor-pointer hover:bg-green-50 transition-colors" onClick={() => handleResClick(res)}>
                                                    <div>
                                                        <Badge className={`h-4 px-1 text-[8px] ${child.colorTheme.bg}`}>{child.master.name || (child.master as any).fullName || "名前なし"}</Badge>
                                                        <span className="ml-2 font-medium">{res.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[8px] h-4">{res.status === "confirmed" ? "確定" : "申請中"}</Badge>
                                                        <Edit2 className="h-3 w-3 text-slate-300" />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Current Reservations Section (Standalone) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <h2 className="text-lg font-bold">現在の予約状況</h2>
                    </div>
                    {childrenData.map(child => {
                        const reservations = allReservations[child.id] || [];
                        const todayStr = new Date().toISOString().split('T')[0];
                        const upcoming = reservations
                            .filter(r => r.date >= todayStr)
                            .sort((a, b) => a.date.localeCompare(b.date));

                        const isExpanded = showMoreRes[child.id];
                        const displayItems = isExpanded ? upcoming : upcoming.slice(0, 5);

                        return (
                            <div key={child.id} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <div className={`w-1 h-3 rounded-full ${child.colorTheme.bg}`} />
                                    <h3 className="text-xs font-bold text-gray-600">{child.master.name || (child.master as any).fullName || "名前なし"} さんの予約確定分概算: {upcoming.filter(r => r.status === "confirmed").reduce((sum, r) => sum + (r.hasSnack ? 100 : 0), 0)}円</h3>
                                </div>
                                <div className="bg-white rounded-xl border shadow-sm divide-y">
                                    {upcoming.length === 0 ? <p className="p-6 text-center text-xs text-muted-foreground">今後の予約はありません</p> :
                                        displayItems.map(res => (
                                            <div key={res.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleResClick(res)}>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-800">{res.date.replaceAll('-', '/')}</span>
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500">{res.time}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={res.status === "confirmed" ? "secondary" : "outline"} className={res.status === "confirmed" ? "bg-green-100 text-green-700 border-none" : ""}>
                                                        {res.status === "confirmed" ? "確定" : "申請中"}
                                                    </Badge>
                                                    <Edit2 className="h-3 w-3 text-gray-300" />
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {upcoming.length > 5 && !isExpanded && (
                                        <button
                                            className="w-full py-2 text-[10px] text-blue-600 font-bold hover:bg-slate-50 transition-colors"
                                            onClick={() => setShowMoreRes(prev => ({ ...prev, [child.id]: true }))}
                                        >
                                            もっと見る ({upcoming.length - 5}件)
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 4. Fee Balance Section (Standalone) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Wallet className="w-4 h-4 text-gray-500" />
                        <h2 className="text-lg font-bold">利用料（残高）</h2>
                    </div>
                    <div className="grid gap-4">
                        {childrenData.map(child => {
                            const calc = childCalculations[child.id];
                            const isLow = (calc?.balance || 0) < 0;

                            return (
                                <Card key={child.id} className={`border ${isLow ? "bg-red-50/50 border-red-200" : "bg-white border-slate-100"}`}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${child.colorTheme.bg} bg-opacity-10`}><Wallet className={`h-4 w-4 ${child.colorTheme.text}`} /></div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">{child.master.name || (child.master as any).fullName || "名前なし"} さんの残高</p>
                                                <p className={`text-xl font-bold ${isLow ? "text-red-600" : "text-gray-800"}`}>
                                                    ¥{calc?.balance.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Link href={`/parent/payment?childId=${child.id}`}>
                                            <Button size="sm" variant="outline" className="text-[10px] h-8 font-bold border-indigo-200 text-indigo-700">入金報告へ</Button>
                                        </Link>
                                    </CardContent>
                                    {isLow && <div className="bg-red-600 text-white text-[9px] py-0.5 text-center font-bold">残高不足です。入金をお願いします。</div>}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </main>



            {/* Standard Dialogs */}
            <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
                <DialogContent><DialogHeader><DialogTitle>欠席連絡</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2"><Label>メモ</Label><Input placeholder="理由など（任意）" value={requestMemo} onChange={e => setRequestMemo(e.target.value)} /></div>
                    <DialogFooter><Button variant="destructive" className="w-full" onClick={handleAbsence}>申請を送信</Button></DialogFooter></DialogContent>
            </Dialog>

            <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                <DialogContent><DialogHeader><DialogTitle>帰宅方法の変更</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <RadioGroup value={returnValue} onValueChange={setReturnValue}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="一人帰り" id="r1" /><Label htmlFor="r1">一人帰り</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="お迎え" id="r2" /><Label htmlFor="r2">お迎え</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="集団下校" id="r3" /><Label htmlFor="r3">集団下校</Label></div>
                        </RadioGroup>
                        <div className="space-y-2"><Label>時間や詳細のメモ</Label><Input placeholder="例: 17:30お迎え" value={requestMemo} onChange={e => setRequestMemo(e.target.value)} /></div>
                    </div>
                    <DialogFooter><Button className="w-full" onClick={handleReturnChange}>変更を申請</Button></DialogFooter></DialogContent>
            </Dialog>

            <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                <DialogContent className="h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>直接チャット</DialogTitle>
                        <DialogDescription>スタッフとメッセージのやり取りができます。</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {childrenData.find(c => c.id === activeChildId)?.attendance?.messages?.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.sender === "parent" ? "items-end" : "items-start"}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${msg.sender === "parent" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white shadow-sm rounded-tl-none border"}`}>{msg.content}</div>
                                <span className="text-[9px] text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t bg-white flex gap-2">
                        <Input placeholder="メッセージを入力..." value={messageInput} onChange={e => setMessageInput(e.target.value)} className="text-xs" />
                        <Button size="icon" onClick={handleSendMessage} className="shrink-0"><MessageCircle className="h-4 w-4" /></Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isResDetailOpen} onOpenChange={setIsResDetailOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>予約詳細</DialogTitle></DialogHeader>
                    {selectedRes && (
                        <div className="space-y-4 py-4 text-sm font-mono">
                            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">日付</span><span className="font-bold">{selectedRes.date}</span></div>
                            <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">時間</span><span className="font-bold">{selectedRes.time}</span></div>
                            <Badge variant="outline" className="w-full justify-center bg-slate-50">{selectedRes.status === "confirmed" ? "承認済" : "承認待ち"}</Badge>
                        </div>
                    )}
                    <DialogFooter className="flex-col gap-2">
                        <Button variant="destructive" className="w-full" onClick={handleCancelRes}>予約を取り消す</Button>
                        <Button variant="outline" className="w-full" onClick={() => setIsResDetailOpen(false)}>閉じる</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Past Fix Request Dialog */}
            <Dialog open={isPastFixOpen} onOpenChange={setIsPastFixOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>修正希望の送信</DialogTitle>
                        <DialogDescription>
                            {selectedRes?.date} の予約内容について修正を依頼します。
                            （管理者の入力ミス指摘など）
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>依頼内容</Label>
                            <Textarea
                                placeholder="例: この日は17:00まででしたが、17:30までと表示されています。修正をお願いします。"
                                value={pastFixRequest}
                                onChange={(e) => setPastFixRequest(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPastFixOpen(false)}>キャンセル</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!pastFixRequest.trim() || isSubmitting}
                            onClick={handlePastFixSubmit}
                        >
                            送信する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Event Detail Dialog */}
            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedEvent?.title}</DialogTitle>
                        <DialogDescription>{selectedEvent?.category === 'event' ? 'イベント情報' : 'お知らせ'}</DialogDescription>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-4 py-4">
                            {selectedEvent.eventDate && (
                                <div className="text-xs text-muted-foreground font-bold">日付: {selectedEvent.eventDate}</div>
                            )}
                            <div className="text-sm leading-relaxed">{/* Content placeholder if we ever add body content */}</div>
                            <div className="flex flex-col gap-2">
                                {selectedEvent.url && (
                                    <Button className="w-full bg-blue-600" onClick={() => window.open(selectedEvent.url, '_blank')}>
                                        詳細（リンク）を開く
                                    </Button>
                                )}
                                {selectedEvent.base64 && (
                                    <Button variant="outline" className="w-full" onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = selectedEvent.base64!;
                                        link.download = selectedEvent.fileName || 'document';
                                        link.click();
                                    }}>
                                        添付ファイルをダウンロード
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={() => setIsEventDialogOpen(false)}>閉じる</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ParentHomePage() {
    return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}><ParentHomeContent /></Suspense>;
}
