"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Phone, Megaphone, User, Users as UsersIcon, Bus, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttendanceRecord, Child } from "@/types/firestore";

interface AttendanceRowProps {
    child: AttendanceRecord;
    master: Child | undefined;
    timeOptions: string[];
    onReturnMethodClick: (child: AttendanceRecord) => void;
    onCheckIn: (id: string) => void;
    onCheckOut: (id: string) => void;
    onTimeChange: (id: string, field: 'arrivalTime' | 'departureTime', value: string) => void;
    onCall: (id: string, name: string) => void;
    isLate?: boolean;
}

function AttendanceRowComponent({
    child,
    master,
    timeOptions,
    onReturnMethodClick,
    onCheckIn,
    onCheckOut,
    onTimeChange,
    onCall,
    isLate = false
}: AttendanceRowProps) {
    const [schedStart, schedEnd] = child.reservationTime.split("-");
    const isPickup = child.returnMethod === "お迎え";
    const hasPending = child.changeRequest?.status === "pending";

    const getReturnMethodIcon = (method: string) => {
        switch (method) {
            case "お迎え": return <User className="h-4 w-4" />;
            case "集団下校": return <UsersIcon className="h-4 w-4" />;
            case "バス": return <Bus className="h-4 w-4" />;
            default: return <Footprints className="h-4 w-4" />;
        }
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

    return (
        <TableRow className={cn("h-12 border-b transition-colors", getRowColor(child.status), hasPending && "bg-yellow-100 hover:bg-yellow-200 ring-2 ring-inset ring-yellow-400 z-10 relative")}>
            <TableCell className="px-2 text-center relative">
                {hasPending && <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse border border-white shadow-sm" />}
                <div
                    className="flex justify-center cursor-pointer hover:opacity-70 transition-opacity"
                    title={child.returnDetails || child.returnMethod}
                    onClick={() => onReturnMethodClick(child)}
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
            <TableCell className={cn("px-2", isLate && "bg-red-50 animate-pulse")}>
                <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                        <span className={cn("font-bold text-sm truncate max-w-[90px]", isLate && "text-red-600")}>{child.childName}</span>
                        {isLate && <Badge variant="destructive" className="text-[8px] h-3 px-1 py-0 w-fit">未着アラート</Badge>}
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-orange-400 hover:text-orange-600 hover:bg-orange-50 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCall(child.childId, child.childName);
                            }}
                        >
                            <Megaphone className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
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
                            onClick={() => onCheckIn(child.id)}
                        >
                            入室
                        </Button>
                    ) : (
                        <Select value={child.arrivalTime || ""} onValueChange={(val) => onTimeChange(child.id, 'arrivalTime', val)}>
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
                            onClick={() => onCheckOut(child.id)}
                        >
                            退室
                        </Button>
                    ) : child.status === "left" ? (
                        <Select value={child.departureTime || ""} onValueChange={(val) => onTimeChange(child.id, 'departureTime', val)}>
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
}

export const AttendanceRow = memo(AttendanceRowComponent);
