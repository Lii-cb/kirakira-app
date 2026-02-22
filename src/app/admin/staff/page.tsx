"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, UserPlus, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getSyncedStaffList, getMonthlyStaffAttendance } from "@/lib/firestore";
import { StaffUser } from "@/types/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StaffManagementPage() {
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [attendanceStats, setAttendanceStats] = useState<Record<string, number>>({});
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const staff = await getSyncedStaffList();
            setStaffList(staff);

            const year = new Date().getFullYear();
            const stats = await getMonthlyStaffAttendance(year, currentMonth);
            setAttendanceStats(stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">職員管理</h1>
                <p className="text-muted-foreground">
                    職員の出勤状況の確認を行えます。
                </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
                <ExternalLink className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700 font-bold">設定について</AlertTitle>
                <AlertDescription className="text-blue-600">
                    職員の追加・削除・編集は、Googleスプレッドシートの「Staff」タブで行ってください。<br />
                    変更後、システムに自動反映されます（またはGASの手動同期を実行）。
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <div className="flex flex-row items-center justify-between">
                        <CardTitle>職員リスト・出勤状況 ({currentMonth}月)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-10"><Spinner /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>名前</TableHead>
                                    <TableHead>メールアドレス</TableHead>
                                    <TableHead>役割</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead>今月の出勤日数</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            登録された職員はいません。スプレッドシートを確認してください。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffList.map((staff) => (
                                        <TableRow key={staff.id}>
                                            <TableCell className="font-medium">{staff.name}</TableCell>
                                            <TableCell>{staff.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{staff.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={staff.isActive ? "secondary" : "outline"}>
                                                    {staff.isActive ? "有効" : "無効"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-bold text-lg">
                                                    {attendanceStats[staff.name] || 0}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-1">回</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
