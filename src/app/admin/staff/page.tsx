"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { Staff, getStaffList, addStaff, deleteStaff, getMonthlyStaffAttendance } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StaffManagementPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [newName, setNewName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState<Record<string, number>>({});
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

    const loadData = async () => {
        const staff = await getStaffList();
        setStaffList(staff);

        const year = new Date().getFullYear();
        // Use current month state if we add selector later, for now just this month
        const stats = await getMonthlyStaffAttendance(year, currentMonth);
        setAttendanceStats(stats);
    };

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setIsSubmitting(true);
        try {
            await addStaff(newName);
            setNewName("");
            loadData();
        } catch (e) {
            console.error(e);
            alert("登録に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name}さんを削除しますか？\n（過去の出勤履歴は残りますが、シフト登録画面の候補からは消えます）`)) return;
        try {
            await deleteStaff(id);
            loadData();
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました。");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">職員管理</h1>
                <p className="text-muted-foreground">
                    職員の登録と出勤状況の確認を行えます。
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>新規職員登録</CardTitle>
                    <CardDescription>新しく職員を追加する場合に入力してください。</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 max-w-sm">
                        <Input
                            placeholder="職員名 (例: 佐藤 花子)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <Button onClick={handleAdd} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            追加
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-row items-center justify-between">
                        <CardTitle>職員リスト・出勤状況 ({currentMonth}月)</CardTitle>
                        {/* Month Selector could go here */}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>名前</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>今月の出勤日数</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        登録された職員はいません。
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staffList.map((staff) => (
                                    <TableRow key={staff.id}>
                                        <TableCell className="font-medium">{staff.name}</TableCell>
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
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(staff.id, staff.name)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
