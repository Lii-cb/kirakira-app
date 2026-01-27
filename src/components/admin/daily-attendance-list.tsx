"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Search, ArrowUpDown, User, Bus, Footprints, Users as UsersIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AttendanceRecord } from "@/types/firestore";
import { subscribeTodayAttendance, updateAttendanceStatus } from "@/lib/firestore";

// Generate Time Options
const generateTimeOptions = () => {
    const options = [];
    for (let hour = 10; hour <= 20; hour++) {
        for (let min = 0; min < 60; min += 10) {
            const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            options.push(timeString);
        }
    }
    return options;
};
const timeOptions = generateTimeOptions();

// Helper: Rounding Logic
const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

const getRoundedArrivalTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / 10) * 10;
    now.setMinutes(roundedMinutes);
    return formatTime(now);
};

const getRoundedDepartureTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 10) * 10;
    now.setMinutes(roundedMinutes);
    return formatTime(now);
};

export function DailyAttendanceList() {
    const [children, setChildren] = useState<AttendanceRecord[]>([]);
    const [selectedChild, setSelectedChild] = useState<AttendanceRecord | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof AttendanceRecord; direction: 'asc' | 'desc' } | null>(null);

    // Initial Data Fetch & Subscription
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const unsubscribe = subscribeTodayAttendance(today, (data) => {
            setChildren(data);
        });
        return () => unsubscribe();
    }, []);

    // Metrics
    const metrics = useMemo(() => {
        const totalEnrolled = 50;
        const totalRegistered = children.length;
        const scheduled = children.length;
        const present = children.filter(c => c.status === "arrived").length;
        const left = children.filter(c => c.status === "left").length;
        const absent = children.filter(c => c.status === "absent").length;

        return { totalEnrolled, totalRegistered, scheduled, present, left, absent };
    }, [children]);

    const handleSort = (key: keyof AttendanceRecord) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedChildren = useMemo(() => {
        const sortableItems = [...children];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue !== 'string' || typeof bValue !== 'string') return 0;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [children, sortConfig]);

    const filteredChildren = sortedChildren.filter((child) =>
        child.childName.includes(searchQuery) || child.className.includes(searchQuery)
    );

    const handleCheckIn = async (id: string) => {
        const today = new Date().toISOString().split('T')[0];
        const child = children.find(c => c.id === id);
        if (!child) return;

        await updateAttendanceStatus(child.childId, today, {
            status: "arrived",
            arrivalTime: getRoundedArrivalTime()
        });
    };

    const handleCheckOut = async (id: string) => {
        const today = new Date().toISOString().split('T')[0];
        const child = children.find(c => c.id === id);
        if (!child) return;

        await updateAttendanceStatus(child.childId, today, {
            status: "left",
            departureTime: getRoundedDepartureTime()
        });
    };

    const handleTimeChange = async (id: string, field: 'arrivalTime' | 'departureTime', value: string) => {
        const today = new Date().toISOString().split('T')[0];
        const child = children.find(c => c.id === id);
        if (!child) return;

        await updateAttendanceStatus(child.childId, today, {
            [field]: value
        });
    };

    const handleReturnMethodClick = (child: AttendanceRecord) => {
        setSelectedChild(child);
        setIsDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "arrived": return <Badge className="bg-green-600 hover:bg-green-700 whitespace-nowrap">入室</Badge>;
            case "left": return <Badge variant="secondary" className="bg-gray-200 text-gray-700 whitespace-nowrap">退室</Badge>;
            case "absent": return <Badge variant="destructive" className="whitespace-nowrap">欠席</Badge>;
            default: return <Badge variant="outline" className="bg-white text-gray-700 border-gray-300 whitespace-nowrap">予定</Badge>;
        }
    };

    const getRowColor = (status: string) => {
        switch (status) {
            case "arrived": return "bg-green-50/50 hover:bg-green-100/50";
            case "left": return "bg-gray-50 hover:bg-gray-100 text-gray-500";
            case "absent": return "bg-red-50 hover:bg-red-100";
            default: return "bg-white hover:bg-yellow-50";
        }
    };

    const handleApproveRequest = async (child: AttendanceRecord) => {
        if (!child.changeRequest) return;
        const today = new Date().toISOString().split('T')[0];
        const req = child.changeRequest;

        const updates: Partial<AttendanceRecord> = {
            changeRequest: { ...req, status: "approved" }
        };

        if (req.type === "absence") {
            updates.status = "absent";
            updates.memo = req.memo; // Update main memo
        } else if (req.type === "returnMethod") {
            updates.returnMethod = req.value;
            updates.returnDetails = req.memo;
        } else if (req.type === "pickupTime") {
            // Update the end time of reservationTime "14:00-17:00" -> "14:00-18:00"
            // Or just store it elsewhere. For now replace logic: Assuming HH:mm format
            const currentStart = child.reservationTime.split('-')[0] || "14:00";
            updates.reservationTime = `${currentStart}-${req.value}`;
        }

        await updateAttendanceStatus(child.childId, today, updates);
        setIsDialogOpen(false);
    };

    const handleRejectRequest = async (child: AttendanceRecord) => {
        if (!child.changeRequest) return;
        const today = new Date().toISOString().split('T')[0];
        await updateAttendanceStatus(child.childId, today, {
            changeRequest: { ...child.changeRequest, status: "rejected" }
        });
        setIsDialogOpen(false);
    };

    const getReturnMethodIcon = (method: string) => {
        switch (method) {
            case "お迎え": return <User className="h-4 w-4" />;
            case "集団下校": return <UsersIcon className="h-4 w-4" />;
            case "バス": return <Bus className="h-4 w-4" />;
            default: return <Footprints className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-2">
            {/* Sticky Compact Header */}
            {/* ... (Header code unchanged, keeping simplistic view for this diff) ... */}
            <div className="sticky -top-4 -mt-4 pt-4 pb-2 z-20 bg-gray-50/95 backdrop-blur -mx-4 px-4 border-b shadow-sm space-y-2">
                {/* Metrics Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar md:justify-start">
                    {/* ... metrics ... */}
                    <div className="flex items-center gap-1 border-r pr-2 shrink-0">
                        <div className="flex flex-col items-center min-w-[30px]">
                            <span className="text-[9px] text-muted-foreground">在籍</span>
                            <span className="text-xs font-bold">{metrics.totalEnrolled}</span>
                        </div>
                        <div className="flex flex-col items-center min-w-[30px]">
                            <span className="text-[9px] text-muted-foreground">登録</span>
                            <span className="text-xs font-bold">{metrics.totalRegistered}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-max">
                        <div className="flex flex-col items-center bg-white border rounded px-2 py-1 min-w-[50px]">
                            <span className="text-[9px] text-muted-foreground">予定</span>
                            <span className="text-sm font-bold">{metrics.scheduled}</span>
                        </div>
                        <div className="flex flex-col items-center bg-green-50 border border-green-100 rounded px-2 py-1 min-w-[50px]">
                            <span className="text-[9px] text-green-600">入室</span>
                            <span className="text-sm font-bold text-green-700">{metrics.present}</span>
                        </div>
                        <div className="flex flex-col items-center bg-gray-50 border border-gray-100 rounded px-2 py-1 min-w-[50px]">
                            <span className="text-[9px] text-gray-600">退室</span>
                            <span className="text-sm font-bold text-gray-700">{metrics.left}</span>
                        </div>
                        <div className="flex flex-col items-center bg-red-50 border border-red-100 rounded px-2 py-1 min-w-[50px]">
                            <span className="text-[9px] text-red-600">欠席</span>
                            <span className="text-sm font-bold text-red-700">{metrics.absent}</span>
                        </div>
                    </div>
                </div>

                {/* Filter & Count Row */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="検索..."
                            className="pl-8 h-9 text-sm bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-white px-2 py-1 rounded border shadow-sm">
                        {filteredChildren.length}名
                    </div>
                </div>
            </div>

            <div className="rounded-md border shadow-sm bg-white overflow-x-auto pb-20">
                <div className="min-w-[500px] md:min-w-full">
                    <Table>
                        <TableHeader className="bg-gray-100">
                            <TableRow>
                                <TableHead className="w-[40px] px-2 text-center">帰</TableHead>
                                <TableHead className="w-[50px] px-2 cursor-pointer" onClick={() => handleSort('className')}>
                                    <div className="flex items-center">組 <ArrowUpDown className="h-3 w-3" /></div>
                                </TableHead>
                                <TableHead className="w-[80px] px-2 cursor-pointer" onClick={() => handleSort('childName')}>
                                    <div className="flex items-center">氏名 <ArrowUpDown className="h-3 w-3" /></div>
                                </TableHead>
                                <TableHead className="w-[40px] px-2 text-center">
                                    状態
                                </TableHead>
                                <TableHead className="w-[100px] px-2 text-center">入室</TableHead>
                                <TableHead className="w-[100px] px-2 text-center">退室</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredChildren.map((child) => {
                                const [schedStart, schedEnd] = child.reservationTime.split("-");
                                const isPickup = child.returnMethod === "お迎え";
                                const hasPending = child.changeRequest?.status === "pending";

                                return (
                                    <TableRow key={child.id} className={cn("h-12", getRowColor(child.status), hasPending && "bg-yellow-50 hover:bg-yellow-100 ring-1 ring-inset ring-yellow-300")}>
                                        <TableCell className="px-2 text-center relative">
                                            {hasPending && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                                            <div
                                                className="flex justify-center cursor-pointer hover:opacity-70 transition-opacity"
                                                title={child.returnDetails || child.returnMethod}
                                                onClick={() => handleReturnMethodClick(child)}
                                            >
                                                {isPickup ? (
                                                    <div className="text-muted-foreground">{getReturnMethodIcon(child.returnMethod)}</div>
                                                ) : (
                                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 p-1 text-[10px]">
                                                        {getReturnMethodIcon(child.returnMethod)}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-2 font-medium text-xs text-center">{child.className}</TableCell>
                                        <TableCell className="px-2 text-sm font-medium truncate max-w-[90px]" title={child.childName}>
                                            {child.childName}
                                        </TableCell>
                                        <TableCell className="px-2 text-center">
                                            <div className="flex justify-center">
                                                {getStatusBadge(child.status)}
                                            </div>
                                        </TableCell>

                                        {/* Arrival Time Cell */}
                                        <TableCell className="px-2 text-center align-middle">
                                            <div className="flex flex-col items-center justify-center gap-1 min-h-[40px]">
                                                {(child.status === "pending" || child.status === "absent") ? (
                                                    <Button
                                                        size="sm"
                                                        className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
                                                        onClick={() => handleCheckIn(child.id)}
                                                    >
                                                        入室
                                                    </Button>
                                                ) : (
                                                    <Select value={child.arrivalTime || ""} onValueChange={(val) => handleTimeChange(child.id, 'arrivalTime', val)}>
                                                        <SelectTrigger className="h-7 w-full text-sm font-bold bg-white/50 border-transparent hover:bg-white hover:border-gray-200 focus:ring-0 px-1 justify-center text-center">
                                                            <SelectValue placeholder="--:--" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[200px]">
                                                            {timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <span className="text-[9px] text-muted-foreground leading-none">{schedStart}</span>
                                            </div>
                                        </TableCell>

                                        {/* Departure Time Cell */}
                                        <TableCell className="px-2 text-center align-middle">
                                            <div className="flex flex-col items-center justify-center gap-1 min-h-[40px]">
                                                {child.status === "arrived" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full h-7 text-xs border-gray-400 text-gray-700 font-bold hover:bg-gray-100"
                                                        onClick={() => handleCheckOut(child.id)}
                                                    >
                                                        退室
                                                    </Button>
                                                ) : child.status === "left" ? (
                                                    <Select value={child.departureTime || ""} onValueChange={(val) => handleTimeChange(child.id, 'departureTime', val)}>
                                                        <SelectTrigger className="h-7 w-full text-sm font-bold bg-white/50 border-transparent hover:bg-white hover:border-gray-200 focus:ring-0 px-1 justify-center text-center">
                                                            <SelectValue placeholder="--:--" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[200px]">
                                                            {timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="h-7"></div>
                                                )}
                                                <span className="text-[9px] text-muted-foreground leading-none">{schedEnd}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Return Details Dialog with Approval */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>詳細情報</DialogTitle>
                        <DialogDescription>
                            {selectedChild?.childName} さん
                        </DialogDescription>
                    </DialogHeader>

                    {selectedChild && (
                        <div className="space-y-4 py-2">
                            {/* Approval Section */}
                            {selectedChild.changeRequest && selectedChild.changeRequest.status === "pending" && (
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2 font-bold text-yellow-800">
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">申請中</span>
                                        申請があります
                                    </div>
                                    <div className="text-sm text-yellow-900 bg-yellow-100/50 p-2 rounded">
                                        <div className="font-semibold">
                                            {selectedChild.changeRequest.type === "absence" && "欠席連絡"}
                                            {selectedChild.changeRequest.type === "returnMethod" && "帰宅変更"}
                                            {selectedChild.changeRequest.type === "pickupTime" && "時間変更"}
                                        </div>
                                        <div>変更内容: {selectedChild.changeRequest.value}</div>
                                        {selectedChild.changeRequest.memo && <div className="mt-1 text-xs text-yellow-700 opacity-80">メモ: {selectedChild.changeRequest.memo}</div>}
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleRejectRequest(selectedChild)}>却下</Button>
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApproveRequest(selectedChild)}>承認・反映</Button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="font-semibold text-sm">帰宅方法:</span>
                                <span className="col-span-2 flex items-center gap-2">
                                    {getReturnMethodIcon(selectedChild.returnMethod)}
                                    {selectedChild.returnMethod}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-4">
                                <span className="font-semibold text-sm mt-1">詳細:</span>
                                <div className="col-span-2 p-2 bg-gray-50 rounded text-sm text-gray-700 min-h-[60px]">
                                    {selectedChild.returnDetails || "詳細情報はありません。"}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="font-semibold text-sm">予約時間:</span>
                                <span className="col-span-2 text-sm">{selectedChild.reservationTime}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
