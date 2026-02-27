"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Plus, UserMinus, User, Clock, Coffee, LogOut, CalendarIcon, Edit2, Users } from "lucide-react";
import { Staff, StaffState, subscribeStaffAttendance, updateStaffStatus, addStaffMember, removeStaffMember, registerStaffShifts, getStaffList, getStaffMemo, updateStaffMemo } from "@/lib/firestore";
import { formatDate } from "@/lib/date";
// ... imports ...



import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

export function StaffAttendanceList() {
    const [staffList, setStaffList] = useState<StaffState[]>([]);

    // Master List
    const [masterStaffList, setMasterStaffList] = useState<Staff[]>([]);

    // Single Add State
    const [isAdding, setIsAdding] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState("");

    // Shift Registration States
    const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
    const [shiftStaffId, setShiftStaffId] = useState("");
    const [shiftDates, setShiftDates] = useState<Date[] | undefined>([]);
    const [shiftTime, setShiftTime] = useState("14:00");
    const [isSubmittingShift, setIsSubmittingShift] = useState(false);

    // Edit Time States
    const [editTimeId, setEditTimeId] = useState<string | null>(null);
    const [editTimeValue, setEditTimeValue] = useState("");

    // Memo State
    const [dailyMemo, setDailyMemo] = useState("");

    useEffect(() => {
        const loadMaster = async () => {
            const list = await getStaffList();
            setMasterStaffList(list.filter(s => s.isActive));

            // Load Memo
            const today = formatDate();
            const memo = await getStaffMemo(today);
            setDailyMemo(memo);
        };
        loadMaster();

        const today = formatDate();
        const unsubscribe = subscribeStaffAttendance(today, (data) => {
            const sorted = [...data].sort((a, b) => {
                const order = { work: 1, temp_out: 2, absent: 3, left: 4, planned: 5 };
                // Put planned last usually, or before absent?
                // planned is basically absent but with shift.
                return (order[a.status] || 99) - (order[b.status] || 99);
            });
            setStaffList(sorted);
        });
        return () => unsubscribe();
    }, []);

    const handleSaveMemo = async (content: string) => {
        const today = formatDate();
        await updateStaffMemo(today, content);
        alert("日報メモを保存しました。");
    };

    const handleAdd = async () => {
        if (!selectedStaffId) return;
        const staff = masterStaffList.find(s => s.id === selectedStaffId);
        if (!staff) return;

        const today = formatDate();
        await addStaffMember(today, staff.name, staff.id);
        setSelectedStaffId("");
        setIsAdding(false);
    };

    const handleStatusChange = async (staff: StaffState, status: StaffState['status']) => {
        const today = formatDate();
        const time = (status === 'work' || status === 'left') ? formatTime(new Date()) : staff.time;
        await updateStaffStatus(today, { ...staff, status, time });
    };

    const handleTimeSave = async (staff: StaffState) => {
        const today = formatDate();
        await updateStaffStatus(today, { ...staff, time: editTimeValue });
        setEditTimeId(null);
    };

    const handleRemove = async (id: string) => {
        if (!confirm("職員リストから削除しますか？")) return;
        const today = formatDate();
        await removeStaffMember(today, id);
    }

    const handleShiftRegister = async () => {
        if (!shiftStaffId || !shiftDates || shiftDates.length === 0) {
            alert("職員と日付を選択してください。");
            return;
        }
        const staff = masterStaffList.find(s => s.id === shiftStaffId);
        if (!staff) return;

        setIsSubmittingShift(true);
        try {
            await registerStaffShifts(staff.name, shiftDates, shiftTime, staff.id);
            alert(`${shiftDates.length}件のシフトを登録しました。`);
            setShiftStaffId("");
            setShiftDates([]);
            setShiftTime("14:00");
            setIsShiftDialogOpen(false);
        } catch (e) {
            console.error(e);
            alert("登録に失敗しました。");
        } finally {
            setIsSubmittingShift(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm p-3 mb-4">

            <div className="flex flex-wrap gap-2">
                {staffList.length === 0 && !isAdding && (
                    <span className="text-xs text-muted-foreground ml-2">本日の職員登録なし</span>
                )}

                {staffList.map((staff) => (
                    <DropdownMenu key={staff.id}>
                        <DropdownMenuTrigger asChild>
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center border rounded px-3 py-1 cursor-pointer transition-all min-w-[90px]",
                                    staff.status === 'work' && "bg-blue-50 border-blue-200 text-blue-800",
                                    staff.status === 'temp_out' && "bg-orange-50 border-orange-200 text-orange-800",
                                    (staff.status === 'left' || staff.status === 'absent') && "bg-gray-50 border-gray-200 text-gray-400 grayscale",
                                    staff.status === 'planned' && "bg-yellow-50 border-yellow-200 text-yellow-800"
                                )}
                            >
                                <span className="font-bold text-sm">{staff.name}</span>
                                <div className="flex flex-col items-center text-[10px] opacity-80 font-mono leading-tight">
                                    {staff.status === 'planned' ? (
                                        <span className="text-muted-foreground">予: {staff.shiftTime || '--:--'}</span>
                                    ) : (
                                        <>
                                            <span>実: {staff.actualTime || staff.time}</span>
                                            {staff.status === 'left' && <span>~ {staff.actualEndTime || staff.time}</span>}
                                        </>
                                    )}
                                </div>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                            <DropdownMenuLabel>ステータス変更</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleStatusChange(staff, 'work')}>
                                <Clock className="h-4 w-4 mr-2" /> 出勤 (現在時刻)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(staff, 'temp_out')}>
                                <Coffee className="h-4 w-4 mr-2" /> 一時退出
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(staff, 'left')}>
                                <LogOut className="h-4 w-4 mr-2" /> 退勤 (現在時刻)
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <div className="p-2 space-y-2">
                                <label className="text-xs font-medium text-muted-foreground block">時間修正 (手動)</label>

                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] w-12 text-right">予定</span>
                                    <Input
                                        className="h-7 text-xs flex-1"
                                        defaultValue={staff.shiftTime || ""}
                                        onBlur={(e) => handleTimeSave({ ...staff, shiftTime: e.target.value })}
                                        placeholder="--:--"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] w-12 text-right">開始</span>
                                    <Input
                                        className="h-7 text-xs flex-1"
                                        defaultValue={staff.actualTime || ""}
                                        onBlur={(e) => handleTimeSave({ ...staff, actualTime: e.target.value, time: e.target.value })}
                                        placeholder="--:--"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] w-12 text-right">終了</span>
                                    <Input
                                        className="h-7 text-xs flex-1"
                                        defaultValue={staff.actualEndTime || ""}
                                        onBlur={(e) => handleTimeSave({ ...staff, actualEndTime: e.target.value })}
                                        placeholder="--:--"
                                    />
                                </div>
                            </div>

                        </DropdownMenuContent>
                    </DropdownMenu>
                ))}
            </div>

            {/* Daily Memo Section */}
            <div className="mt-4 pt-4 border-t">
                <label className="text-xs font-bold text-muted-foreground mb-2 block">職員用・今日の日報メモ (全体)</label>
                <div className="flex gap-2">
                    <Textarea
                        className="text-sm min-h-[60px]"
                        placeholder="本日の活動内容、様子、申し送り事項など..."
                        value={dailyMemo}
                        onChange={(e) => setDailyMemo(e.target.value)}
                    />
                    <Button variant="secondary" className="h-auto" onClick={() => handleSaveMemo(dailyMemo)}>保存</Button>
                </div>
            </div>
        </div>
    );
}
