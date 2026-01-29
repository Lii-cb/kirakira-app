"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageCircle, AlertTriangle, Loader2 } from "lucide-react";
import { subscribeTodayAttendance, updateAttendanceStatus } from "@/lib/firestore";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { AttendanceRecord } from "@/types/firestore";
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

export default function GuardianHomePage() {
    const [child, setChild] = useState<AttendanceRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [childId, setChildId] = useState<string | null>(null);
    const router = useRouter();

    // Dialog States
    const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [requestMemo, setRequestMemo] = useState("");
    const [returnValue, setReturnValue] = useState("お迎え");

    useEffect(() => {
        // Auth Check using Firebase
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user || !user.email) {
                router.push("/guardian/login");
                return;
            }

            // Find child by email
            // Query children where authorizedEmails contains user.email
            const q = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // Authenticated but no linked child
                setLoading(false);
                // Optionally handle this state better
                return;
            }

            // Pick the first child found
            const childDoc = snapshot.docs[0];
            const foundChildId = childDoc.id;
            setChildId(foundChildId);

            // Subscribe to attendance
            const today = new Date().toISOString().split('T')[0];
            const unsubscribeAttendance = subscribeTodayAttendance(today, (data) => {
                const myChild = data.find(c => c.childId === foundChildId);
                // If no attendance record, maybe create a "stand-in" from child doc?
                // For now, follow existing logic.
                setChild(myChild || null);
                setLoading(false);
            });

            return () => unsubscribeAttendance();
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleLogout = async () => {
        if (confirm("ログアウトしますか？")) {
            await auth.signOut();
            router.push("/guardian/login");
        }
    };

    const handleSubmitRequest = async (type: "absence" | "returnMethod" | "pickupTime", value: string, memo?: string) => {
        if (!child) return;
        const today = new Date().toISOString().split('T')[0];

        await updateAttendanceStatus(child.childId, today, {
            changeRequest: {
                type,
                value,
                memo: memo || "",
                status: "pending"
            }
        });

        setIsAbsenceOpen(false);
        setIsReturnOpen(false);
        setRequestMemo("");
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

    // Safety check if child not found in today's attendance but we have an ID
    // Maybe we should fetch Child Master data too if not in "Today Attendance"?
    // For now, if not in attendance, show "No Schedule" but keeping the Logout button is important.

    // Helper render for header to avoid code duplication if we return early
    const renderHeader = (name: string, id: string, classNameStr: string) => (
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src="/placeholder-child.png" />
                <AvatarFallback className="bg-primary/10 text-primary">子</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="text-xl font-bold text-gray-800">{name}</h2>
                <div className="text-sm text-muted-foreground">{classNameStr}</div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-xs bg-gray-50">ID: {id}</Badge>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500 hover:text-red-600 px-1" onClick={handleLogout}>
                    <LogOut className="w-3 h-3 mr-1" />
                    ログアウト
                </Button>
            </div>
        </div>
    );

    if (!child) {
        return (
            <div className="space-y-6 max-w-lg mx-auto pb-20 pt-10 px-4">
                {renderHeader("読み込み中...", childId || "", "")}
                <div className="p-10 text-center text-muted-foreground bg-white rounded-lg border">
                    本日の利用予定（出席データ）が見つかりません。<br />
                    お休みか、まだ登録されていない可能性があります。
                </div>
            </div>
        );
    }

    const statusLabel =
        child.status === "arrived" ? "入室中" :
            child.status === "left" ? "退室済" :
                child.status === "absent" ? "欠席" : "利用予定";

    const statusColor =
        child.status === "arrived" ? "bg-blue-600" :
            child.status === "left" ? "bg-gray-500" :
                child.status === "absent" ? "bg-red-500" : "bg-green-600";

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            {/* Child Header */}
            {renderHeader(child.childName, child.childId, child.className)}

            {/* Pending Request Banner */}
            {child.changeRequest && child.changeRequest.status === "pending" && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-bold">申請確認中...</span>
                    </div>
                    <Badge variant="outline" className="bg-white border-yellow-300">
                        {child.changeRequest.type === "absence" ? "欠席" : "変更"}
                    </Badge>
                </div>
            )}

            {/* Main Status Display */}
            <Card className="overflow-hidden border shadow-md">
                <div className={`${statusColor} p-6 text-white text-center transition-colors`}>
                    <div className="text-sm opacity-90 mb-2">現在の状況</div>
                    <div className="text-3xl font-bold tracking-wider">{statusLabel}</div>
                </div>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                            <span className="text-xs text-muted-foreground">入室時間</span>
                            <span className="text-xl font-bold text-gray-800">{child.arrivalTime || "--:--"}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                            <span className="text-xs text-muted-foreground">退室時間</span>
                            <span className="text-xl font-bold text-gray-800">{child.departureTime || "--:--"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Today's Details */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md">本日の予定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-gray-500">帰宅方法</span>
                        <span className="font-medium">{child.returnMethod}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-gray-500">予約時間</span>
                        <span className="font-medium">{child.reservationTime}</span>
                    </div>
                    {child.returnDetails && (
                        <div className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm text-gray-500">詳細・メモ</span>
                            <span className="font-medium text-sm">{child.returnDetails}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
                <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-gray-50 border-gray-200">
                            <LogOut className="h-6 w-6 text-orange-500" />
                            <span className="font-medium text-gray-700">お迎え・帰宅変更</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>帰宅方法の変更</DialogTitle>
                            <DialogDescription>本日（{child.date}）の帰宅方法を変更します。</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <RadioGroup value={returnValue} onValueChange={setReturnValue}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="お迎え" id="r1" />
                                    <Label htmlFor="r1">お迎え</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="一人帰り" id="r2" />
                                    <Label htmlFor="r2">一人帰り</Label>
                                </div>
                            </RadioGroup>
                            <div className="space-y-2">
                                <Label>詳細メモ (お迎えの方の名前など)</Label>
                                <Input value={requestMemo} onChange={(e) => setRequestMemo(e.target.value)} placeholder="例: 祖母が迎えに行きます" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => handleSubmitRequest("returnMethod", returnValue, requestMemo)}>申請する</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-gray-50 border-gray-200">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                            <span className="font-medium text-gray-700">欠席連絡</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>欠席の連絡</DialogTitle>
                            <DialogDescription>本日（{child.date}）を欠席します。</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-4">
                            <Label>理由 (任意)</Label>
                            <Input value={requestMemo} onChange={(e) => setRequestMemo(e.target.value)} placeholder="例: 発熱のため" />
                        </div>
                        <DialogFooter>
                            <Button variant="destructive" onClick={() => handleSubmitRequest("absence", "欠席", requestMemo)}>欠席を連絡する</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-gray-50 border-gray-200 col-span-2">
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                    <span className="font-medium text-gray-700">スタッフへ連絡</span>
                </Button>
            </div>
        </div>
    );
}
