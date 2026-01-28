"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getApplications, processApplication } from "@/lib/firestore";
import { Application } from "@/types/firestore";
import { Loader2, CheckCircle } from "lucide-react";

export default function AdminApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchApps = async () => {
        setLoading(true);
        try {
            const data = await getApplications();
            setApplications(data);
        } catch (error) {
            console.error("Failed to fetch applications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, []);

    const handleProcess = async (app: Application) => {
        if (!confirm(`${app.childLastName} ${app.childFirstName} さんを名簿に登録しますか？`)) return;

        setProcessingId(app.id);
        try {
            await processApplication(app);
            await fetchApps(); // Refresh list
        } catch (error) {
            console.error("Failed to process application", error);
            alert("登録に失敗しました。");
        } finally {
            setProcessingId(null);
        }
    };

    const newApps = applications.filter(a => a.status === "new");
    const processedApps = applications.filter(a => a.status === "processed");

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">入会申込管理</h1>

            {/* New Applications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        未処理の申込
                        <Badge variant={newApps.length > 0 ? "destructive" : "secondary"}>
                            {newApps.length}件
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Webフォームから送信された入会申込です。「登録」ボタンを押すと児童名簿に追加されます。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                    ) : newApps.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">未処理の申込はありません。</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>申請日時</TableHead>
                                    <TableHead>氏名</TableHead>
                                    <TableHead>学年</TableHead>
                                    <TableHead>保護者</TableHead>
                                    <TableHead>連絡先</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {newApps.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell>
                                            {app.submissionDate?.toDate ? app.submissionDate.toDate().toLocaleString() : "---"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{app.childLastName} {app.childFirstName}</div>
                                            <div className="text-xs text-muted-foreground">{app.childLastNameKana} {app.childFirstNameKana}</div>
                                        </TableCell>
                                        <TableCell>{app.grade}年</TableCell>
                                        <TableCell>
                                            <div>{app.guardianLastName} {app.guardianFirstName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs">{app.phone}</div>
                                            <div className="text-xs">{app.email}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleProcess(app)}
                                                disabled={processingId === app.id}
                                            >
                                                {processingId === app.id ? <Loader2 className="animate-spin w-4 h-4" /> : "登録"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Processed History (Optional view) */}
            <Card className="bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-lg text-muted-foreground">処理済み履歴</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>受付日時</TableHead>
                                <TableHead>氏名</TableHead>
                                <TableHead>状態</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedApps.map(app => (
                                <TableRow key={app.id} className="opacity-60">
                                    <TableCell>{app.submissionDate?.toDate?.().toLocaleDateString() || "---"}</TableCell>
                                    <TableCell>{app.childLastName} {app.childFirstName}</TableCell>
                                    <TableCell><Badge variant="outline" className="bg-gray-100 text-gray-500"><CheckCircle className="w-3 h-3 mr-1" /> 登録済</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
