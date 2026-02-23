"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageCircle, AlertTriangle, Home as HomeIcon, Clock, Moon, Calendar as CalendarIcon, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { subscribeTodayAttendance, updateAttendanceStatus, getDocuments } from "@/lib/firestore";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { AttendanceRecord, Child, AppDocument } from "@/types/firestore";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ja } from "date-fns/locale";
import { SIBLING_COLORS } from "@/lib/constants";
import { ChildData } from "@/types/firestore";


function ParentHomeContent() {
    const [childrenData, setChildrenData] = useState<ChildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isAdminViewing, setIsAdminViewing] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetChildIdParam = searchParams.get("childId");

    // Event Calendar State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<AppDocument[]>([]);

    // Dialog States (Managed per action, not per child to keep DOM light)
    const [activeChildId, setActiveChildId] = useState<string | null>(null);
    const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [isMessageOpen, setIsMessageOpen] = useState(false);

    // Form States
    const [requestMemo, setRequestMemo] = useState("");
    const [returnValue, setReturnValue] = useState("お迎え");
    const [messageInput, setMessageInput] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/parent/login");
                return;
            }
            setUserEmail(user.email);

            try {
                let targetChildIds: string[] = [];
                let adminMode = false;

                // Admin viewing a specific child via ?childId=xxx
                if (targetChildIdParam) {
                    const staffQ = query(collection(db, "staff_users"), where("email", "==", user.email));
                    const staffSnap = await getDocs(staffQ);
                    if (!staffSnap.empty && staffSnap.docs[0].data().role === "admin") {
                        // Verify the child exists
                        const childDoc = await getDoc(doc(db, "children", targetChildIdParam));
                        if (childDoc.exists()) {
                            targetChildIds = [targetChildIdParam];
                            adminMode = true;
                            setIsAdminViewing(true);
                        } else {
                            alert("指定された児童が見つかりません。");
                            setLoading(false);
                            return;
                        }
                    }
                }

                // Normal parent flow (only if not admin-viewing)
                if (!adminMode) {
                    const parentQuery = query(collection(db, "parents"), where("email", "==", user.email));
                    const parentSnapshot = await getDocs(parentQuery);

                    if (!parentSnapshot.empty) {
                        const parentData = parentSnapshot.docs[0].data();
                        targetChildIds = parentData.childIds || [];
                    } else {
                        const q = query(
                            collection(db, "children"),
                            where("authorizedEmails", "array-contains", user.email)
                        );
                        const snapshot = await getDocs(q);
                        targetChildIds = snapshot.docs.map(d => d.id);
                    }

                    if (targetChildIds.length === 0) {
                        const q = query(
                            collection(db, "children"),
                            where("authorizedEmails", "array-contains", user.email)
                        );
                        const snapshot = await getDocs(q);
                        const directIds = snapshot.docs.map(d => d.id);
                        targetChildIds = Array.from(new Set([...targetChildIds, ...directIds]));
                    }
                }

                if (targetChildIds.length === 0) {
                    alert("メールアドレスに紐づく児童が見つかりません。");
                    setLoading(false);
                    return;
                }

                // Fetch Child Master Data
                const childrenPromises = targetChildIds.map(async (id, index) => {
                    const d = await getDoc(doc(db, "children", id));

                    if (d.exists()) {
                        return {
                            id: d.id,
                            master: d.data() as Child,
                            attendance: null, // Will be filled by subscription
                            colorTheme: SIBLING_COLORS[index % SIBLING_COLORS.length]
                        };
                    }
                    return null;
                });

                const loadedChildren = (await Promise.all(childrenPromises)).filter(c => c !== null) as ChildData[];

                // Sort by grade (descending) or name
                // loadedChildren.sort((a, b) => (a.master.grade || 0) - (b.master.grade || 0));

                setChildrenData(loadedChildren);

                // Fetch Events
                const docs = await getDocuments();
                setEvents(docs.filter(d => d.category === "event" && d.eventDate));
                setLoading(false);

            } catch (err) {
                console.error("Error fetching children:", err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router, targetChildIdParam]);

    // Subscribe to attendance for all children
    useEffect(() => {
        if (childrenData.length === 0) return;

        const today = new Date().toISOString().split('T')[0];
        const unsubscribe = subscribeTodayAttendance(today, (allRecords) => {
            setChildrenData(prev => prev.map(child => {
                const myRecord = allRecords.find(r => r.childId === child.id);
                return {
                    ...child,
                    attendance: myRecord || null
                };
            }));
        });

        return () => unsubscribe();
    }, [childrenData.length]); // Only re-sub if children count changes (initial load)

    // Action Handlers
    const openAbsenceDialog = (childId: string) => {
        setActiveChildId(childId);
        setIsAbsenceOpen(true);
    };

    const openReturnDialog = (childId: string) => {
        setActiveChildId(childId);
        setIsReturnOpen(true);
    };

    const openMessageDialog = (childId: string) => {
        setActiveChildId(childId);
        setIsMessageOpen(true);
    };

    const handleAbsence = async () => {
        if (!activeChildId) return;
        const today = new Date().toISOString().split('T')[0];

        await updateAttendanceStatus(activeChildId, today, {
            status: "absent",
            memo: requestMemo
        });
        setIsAbsenceOpen(false);
        setRequestMemo("");
        setActiveChildId(null);
    };

    const handleReturnChange = async () => {
        if (!activeChildId) return;
        const today = new Date().toISOString().split('T')[0];
        await updateAttendanceStatus(activeChildId, today, {
            returnMethod: returnValue,
            memo: requestMemo
        });
        setIsReturnOpen(false);
        setRequestMemo("");
        setActiveChildId(null);
    };

    const handleSendMessage = async () => {
        if (!activeChildId || !messageInput.trim()) return;

        const activeChild = childrenData.find(c => c.id === activeChildId);
        if (!activeChild) return;

        const today = new Date().toISOString().split('T')[0];

        // parentName has been removed from child data model
        const senderName = "保護者";

        const newMessage = {
            id: `msg-${Date.now()}`,
            sender: 'parent' as const,
            senderName: senderName,
            content: messageInput,
            timestamp: new Date().toISOString()
        };

        const currentMessages = activeChild.attendance?.messages || [];
        await updateAttendanceStatus(activeChildId, today, {
            messages: [...currentMessages, newMessage]
        });
        setMessageInput("");
    };

    const handleLogout = () => {
        auth.signOut();
        router.push("/");
    };

    // Helper to get active child for dialogs
    const getActiveChild = () => childrenData.find(c => c.id === activeChildId);

    // Render Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg opacity-50">
                            <HomeIcon className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-800">きらきら児童クラブ</span>
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full" />
                </header>
                <main className="p-4 max-w-md mx-auto space-y-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </main>
            </div>
        );
    }

    // Render Event Calendar (Shared among siblings)
    const getEventsForDate = (day: Date) => {
        const dateStr = day.toISOString().split('T')[0];
        return events.filter(e => e.eventDate === dateStr);
    };
    const selectedEvents = date ? getEventsForDate(date) : [];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <HomeIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-800">きらきら児童クラブ</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-xs text-right hidden sm:block">
                        <div className="font-bold text-gray-700">{userEmail}</div>
                        <div className="text-gray-400">保護者</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Admin Viewing Banner */}
            {isAdminViewing && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        <span>管理者として閲覧中</span>
                    </div>
                    <Link href="/admin/users" className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium">
                        <ArrowLeft className="h-3 w-3" />
                        児童名簿に戻る
                    </Link>
                </div>
            )}

            <main className="p-4 max-w-md mx-auto space-y-8">

                {childrenData.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                        <p className="text-gray-500">表示できる児童がいません。</p>
                    </div>
                )}

                {/* Iterate over siblings */}
                {childrenData.map((child) => {
                    const { master, attendance, colorTheme } = child;

                    const isPresent = attendance?.status === "arrived";
                    const isLeft = attendance?.status === "left";
                    const isAbsent = attendance?.status === "absent";

                    // Simple logic for status display
                    let statusLabel = "予定";

                    if (isPresent) {
                        statusLabel = "入室中";
                    } else if (isLeft) {
                        statusLabel = "帰宅済";
                    } else if (isAbsent) {
                        statusLabel = "欠席";
                    }

                    return (
                        <div key={child.id} className="space-y-3">
                            {/* Child Card Header with Color Theme */}
                            <div className={`flex items-center gap-3 p-3 rounded-t-xl text-white shadow-sm ${colorTheme.bg}`}>
                                <Avatar className="h-12 w-12 border-2 border-white/50">
                                    <AvatarFallback className={`${colorTheme.light} ${colorTheme.text} font-bold`}>
                                        {master.name?.[0] || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-lg font-bold leading-tight">{master.name}</h2>
                                    <p className="text-xs text-white/80">{master.grade}年生</p>
                                </div>
                                <div className="ml-auto">
                                    <Badge variant="outline" className={`bg-white/20 text-white border-none`}>
                                        {statusLabel}
                                    </Badge>
                                </div>
                            </div>

                            {/* Status & Times */}
                            <Card className={`border-t-0 rounded-t-none shadow-sm -mt-3`}>
                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <span className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> 入室
                                            </span>
                                            <span className="font-mono text-lg font-bold text-gray-700">
                                                {attendance?.arrivalTime || "--:--"}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <span className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                                                <LogOut className="w-3 h-3" /> 退室
                                            </span>
                                            <span className="font-mono text-lg font-bold text-gray-700">
                                                {attendance?.departureTime || "--:--"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons Grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant="outline"
                                            className="h-auto flex-col gap-1 py-3 bg-white hover:bg-red-50 border-gray-200 hover:border-red-200 text-xs"
                                            onClick={() => openAbsenceDialog(child.id)}
                                        >
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                            <span>欠席連絡</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="h-auto flex-col gap-1 py-3 bg-white hover:bg-green-50 border-gray-200 hover:border-green-200 text-xs"
                                            onClick={() => openReturnDialog(child.id)}
                                        >
                                            <Moon className="h-5 w-5 text-green-600" />
                                            <span>帰宅変更</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="h-auto flex-col gap-1 py-3 bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-200 text-xs"
                                            onClick={() => openMessageDialog(child.id)}
                                        >
                                            <MessageCircle className="h-5 w-5 text-blue-500" />
                                            <span>連絡</span>
                                            {attendance?.messages && attendance.messages.length > 0 && (
                                                <Badge className="absolute top-[-5px] right-[-5px] h-5 w-5 p-0 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] border border-white">
                                                    {attendance.messages.length}
                                                </Badge>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="mt-3 text-xs text-gray-500 text-center">
                                        今日の予定: <span className="font-medium text-gray-800">{attendance?.returnMethod || master.defaultReturnMethod || "通常通り"}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}

                {/* Common Event Calendar */}
                <Card className="border-none shadow-sm mt-8">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" /> イベントカレンダー
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center">
                            <Calendar
                                locale={ja}
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border"
                                modifiers={{
                                    event: (date) => getEventsForDate(date).length > 0
                                }}
                                modifiersStyles={{
                                    event: {
                                        fontWeight: 'bold',
                                        textDecoration: 'underline',
                                        color: '#2563eb'
                                    }
                                }}
                            />
                        </div>
                        <div className="mt-4 bg-blue-50 p-3 rounded-lg min-h-[80px]">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">
                                {date?.toLocaleDateString()} のイベント
                            </h4>
                            {selectedEvents.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedEvents.map(e => (
                                        <li key={e.id} className="text-sm bg-white p-2 rounded shadow-sm border border-blue-100 flex items-center justify-between">
                                            <span>{e.title}</span>
                                            {e.url ? (
                                                <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">開く</a>
                                            ) : e.base64 ? (
                                                <a href={e.base64} download={e.fileName} className="text-xs text-green-600 underline">DL</a>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-blue-400">イベントはありません</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Dialogs - Shared but context-aware via activeChildId */}
                <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>欠席の連絡</DialogTitle>
                            <DialogDescription>
                                {getActiveChild()?.master.name} さんの欠席を連絡します。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>理由・備考</Label>
                                <Input
                                    placeholder="体調不良のため など"
                                    value={requestMemo}
                                    onChange={e => setRequestMemo(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="destructive" onClick={handleAbsence}>送信する</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>帰宅方法の変更</DialogTitle>
                            <DialogDescription>
                                {getActiveChild()?.master.name} さんの帰宅方法を変更します。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <RadioGroup value={returnValue} onValueChange={setReturnValue}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="一人帰り" id="r1" />
                                    <Label htmlFor="r1">一人帰り</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="お迎え" id="r2" />
                                    <Label htmlFor="r2">お迎え</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="集団下校" id="r3" />
                                    <Label htmlFor="r3">集団下校</Label>
                                </div>
                            </RadioGroup>
                            <div className="space-y-2">
                                <Label>備考（お迎え時間など）</Label>
                                <Input
                                    placeholder="17:30ごろ母迎え"
                                    value={requestMemo}
                                    onChange={e => setRequestMemo(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleReturnChange}>変更する</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                    <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>スタッフへ連絡</DialogTitle>
                            <DialogDescription>
                                {getActiveChild()?.master.name} さんについて、本日（{getActiveChild()?.attendance?.date || "---"}）の連絡事項やメッセージを送信できます。
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-md border space-y-4">
                            {(!getActiveChild()?.attendance?.messages || getActiveChild()?.attendance?.messages?.length === 0) && (
                                <div className="text-center text-gray-400 text-sm py-10">履歴はありません</div>
                            )}
                            {getActiveChild()?.attendance?.messages?.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col text-sm max-w-[85%] ${msg.sender === 'parent' ? "ml-auto items-end" : "items-start"}`}>
                                    <div className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} ({new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</div>
                                    <div className={`px-3 py-2 rounded-2xl ${msg.sender === 'parent' ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border text-gray-800 rounded-tl-none shadow-sm"}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-2 flex gap-2">
                            <Input
                                placeholder="メッセージを入力..."
                                value={messageInput}
                                onChange={e => setMessageInput(e.target.value)}
                                className="flex-1"
                            />
                            <Button size="icon" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                                <MessageCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}

export default function ParentHomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-gray-400">読み込み中...</div>
            </div>
        }>
            <ParentHomeContent />
        </Suspense>
    );
}
