"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageCircle, AlertTriangle, Loader2, Home as HomeIcon, Clock, Moon, Calendar as CalendarIcon } from "lucide-react";
import { subscribeTodayAttendance, updateAttendanceStatus, getDocuments } from "@/lib/firestore";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
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

export default function GuardianHomePage() {
    const [child, setChild] = useState<AttendanceRecord | null>(null);
    const [childMaster, setChildMaster] = useState<Child | null>(null);
    const [loading, setLoading] = useState(true);
    const [childId, setChildId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    // Event Calendar State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<AppDocument[]>([]);

    // Dialog States
    const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [requestMemo, setRequestMemo] = useState("");
    const [returnValue, setReturnValue] = useState("お迎え");
    const [messageInput, setMessageInput] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/guardian/login");
                return;
            }
            setUserEmail(user.email);

            // Find child by authorizedEmail
            try {
                const q = query(
                    collection(db, "children"),
                    where("authorizedEmails", "array-contains", user.email)
                );
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    alert("メールアドレスに紐づく児童が見つかりません。");
                    setLoading(false);
                    return;
                }

                // Pick the first child found
                const childDoc = snapshot.docs[0];
                const foundChildId = childDoc.id;
                setChildId(foundChildId);
                setChildMaster(childDoc.data() as Child);

                // Fetch Events
                const docs = await getDocuments();
                setEvents(docs.filter(d => d.category === "event" && d.eventDate));

            } catch (err) {
                console.error("Error fetching child:", err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!childId) return;

        const today = new Date().toISOString().split('T')[0];
        const unsubscribe = subscribeTodayAttendance(today, (data) => {
            const myRecord = data.find(r => r.childId === childId);
            setChild(myRecord || null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [childId]);

    const handleAbsence = async () => {
        if (!childId) return;
        const today = new Date().toISOString().split('T')[0];

        await updateAttendanceStatus(childId, today, {
            status: "absent",
            memo: requestMemo
        });
        setIsAbsenceOpen(false);
        setRequestMemo("");
    };

    const handleReturnChange = async () => {
        if (!childId) return;
        const today = new Date().toISOString().split('T')[0];
        await updateAttendanceStatus(childId, today, {
            returnMethod: returnValue,
            memo: requestMemo
        });
        setIsReturnOpen(false);
        setRequestMemo("");
    };

    const handleSendMessage = async () => {
        if (!child || !messageInput.trim()) return;
        const today = new Date().toISOString().split('T')[0];

        // New: Use guardian name from master if available
        const senderName = childMaster?.guardianName || "保護者";

        const newMessage = {
            id: `msg-${Date.now()}`,
            sender: 'guardian' as const,
            senderName: senderName,
            content: messageInput,
            timestamp: new Date().toISOString()
        };

        const currentMessages = child.messages || [];
        await updateAttendanceStatus(child.childId, today, {
            messages: [...currentMessages, newMessage]
        });
        setMessageInput("");
    };

    const handleLogout = () => {
        auth.signOut();
        router.push("/");
    };



    // ... existing code ...

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                {/* Header Skeleton */}
                <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg opacity-50">
                            <HomeIcon className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-800">きらきら学童</span>
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full" />
                </header>

                <main className="p-4 max-w-md mx-auto space-y-4">
                    {/* Child Info Skeleton */}
                    <Card className="border-none shadow-sm overflow-hidden">
                        <div className="bg-blue-600/50 h-20 relative" />
                        <div className="px-4 pb-4 mt-6">
                            <Skeleton className="h-8 w-40 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </Card>

                    {/* Status Card Skeleton */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-20 w-full mb-4 rounded-xl" />
                            <div className="grid grid-cols-2 gap-3">
                                <Skeleton className="h-16 w-full rounded-lg" />
                                <Skeleton className="h-16 w-full rounded-lg" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calendar Skeleton */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full rounded-md" />
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    if (!childId) {
        return (
            <div className="p-4 text-center">
                <p>児童データの読み込みに失敗しました。</p>
                <Button onClick={handleLogout} className="mt-4">ログアウト</Button>
            </div>
        );
    }

    // Status Helpers
    const isPresent = child?.status === "arrived";
    const isLeft = child?.status === "left";
    const isAbsent = child?.status === "absent";
    const statusLabel = isPresent ? "入室中" : isLeft ? "帰宅済" : isAbsent ? "欠席" : "予定";
    const statusColor = isPresent ? "bg-green-100 text-green-700 border-green-200" :
        isLeft ? "bg-gray-100 text-gray-700 border-gray-200" :
            isAbsent ? "bg-red-100 text-red-700 border-red-200" : "bg-white border-gray-200";

    // Calendar Helpers
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
                    <span className="font-bold text-gray-800">きらきら学童</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500">
                    <LogOut className="h-5 w-5" />
                </Button>
            </header>

            <main className="p-4 max-w-md mx-auto space-y-4">
                {/* Child Info Card */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="bg-blue-600 h-20 relative">
                        <div className="absolute -bottom-8 left-4">
                            <Avatar className="h-20 w-20 border-4 border-white shadow-md">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                                    {childMaster?.name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div className="mt-10 px-4 pb-4">
                        <h2 className="text-2xl font-bold text-gray-900">{childMaster?.name}</h2>
                        <p className="text-gray-500 text-sm">{childMaster?.grade}年生 {childMaster?.className}</p>
                    </div>
                </Card>

                {/* Status Card */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> 本日の状況 ({child?.date || "---"})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`p-4 rounded-xl border-2 ${statusColor} text-center mb-4 transition-all`}>
                            <span className="text-3xl font-bold tracking-widest">{statusLabel}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="block text-xs text-gray-400 mb-1">入室時間</span>
                                <span className="font-mono text-lg font-bold text-gray-700">{child?.arrivalTime || "--:--"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="block text-xs text-gray-400 mb-1">退室時間</span>
                                <span className="font-mono text-lg font-bold text-gray-700">{child?.departureTime || "--:--"}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <span className="text-xs text-gray-400 block">予定/帰宅方法</span>
                                {child?.returnMethod || childMaster?.defaultReturnMethod}
                            </div>
                            {child?.returnMethod === "お迎え" && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">お迎え待ち</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Event Calendar */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> イベントカレンダー
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center">
                            <Calendar
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
                                        color: '#2563eb' // blue-600
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

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-red-50 border-gray-200 hover:border-red-200">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                                <span className="font-medium text-gray-700">欠席連絡</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>欠席の連絡</DialogTitle>
                                <DialogDescription>本日の欠席を連絡します。</DialogDescription>
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
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-green-50 border-gray-200 hover:border-green-200">
                                <Moon className="h-6 w-6 text-green-600" />
                                <span className="font-medium text-gray-700">帰宅変更</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>帰宅方法の変更</DialogTitle>
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

                    <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-gray-50 border-gray-200 col-span-2" onClick={() => setIsMessageOpen(true)}>
                        <MessageCircle className="h-6 w-6 text-blue-500" />
                        <span className="font-medium text-gray-700">スタッフへ連絡</span>
                    </Button>

                    <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                        <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>スタッフへ連絡</DialogTitle>
                                <DialogDescription>
                                    本日（{child?.date || "---"}）の連絡事項やメッセージを送信できます。
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-md border space-y-4">
                                {(!child?.messages || child.messages.length === 0) && (
                                    <div className="text-center text-gray-400 text-sm py-10">履歴はありません</div>
                                )}
                                {child?.messages?.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col text-sm max-w-[85%] ${msg.sender === 'guardian' ? "ml-auto items-end" : "items-start"}`}>
                                        <div className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} ({new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</div>
                                        <div className={`px-3 py-2 rounded-2xl ${msg.sender === 'guardian' ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border text-gray-800 rounded-tl-none shadow-sm"}`}>
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
                </div>
            </main>
        </div>
    );
}
