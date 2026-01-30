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
    const [childMaster, setChildMaster] = useState<any>(null); // Child Master Data
    const [loading, setLoading] = useState(true);
    const [childId, setChildId] = useState<string | null>(null);
    const router = useRouter();

    // Dialog States
    const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [requestMemo, setRequestMemo] = useState("");
    const [returnValue, setReturnValue] = useState("お迎え");
    const [messageInput, setMessageInput] = useState("");

    // ... (useEffect Auth Check) ... 
    // Pick the first child found
    const childDoc = snapshot.docs[0];
    const foundChildId = childDoc.id;
    setChildId(foundChildId);
    setChildMaster(childDoc.data()); // Store master data

    // Subscribe to attendance
    // ...

    const handleSendMessage = async () => {
        if (!child || !messageInput.trim()) return;
        const today = new Date().toISOString().split('T')[0];

        const senderName = childMaster?.guardianName || "保護者";

        const newMessage: any = {
            id: `msg-${Date.now()}`,
            sender: 'guardian',
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

    // ... (Render Header and Helper functions) ...

                <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-white hover:bg-gray-50 border-gray-200 col-span-2" onClick={() => setIsMessageOpen(true)}>
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                    <span className="font-medium text-gray-700">スタッフへ連絡</span>
                </Button>

                <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                    <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>スタッフへ連絡</DialogTitle>
                            <DialogDescription>
                                本日（{child?.date}）の連絡事項やメッセージを送信できます。
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-md border space-y-4">
                            {(!child?.messages || child.messages.length === 0) && (
                                <div className="text-center text-gray-400 text-sm py-10">履歴はありません</div>
                            )}
                            {child?.messages?.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col text-sm max-w-[85%] ${msg.sender === 'guardian' ? "ml-auto items-end" : "items-start"}`}>
                                    <div className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} ({new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</div>
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
        </div >
    );
}
