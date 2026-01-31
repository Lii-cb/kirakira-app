"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, UserPlus, FileText } from "lucide-react";
import { getApplications, processApplication } from "@/lib/firestore";
import { Application } from "@/types/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, []);

    const handleApprove = async (app: Application) => {
        if (!confirm(`${app.childLastName} ${app.childFirstName} さんの入会を承認し、児童名簿に追加しますか？`)) return;

        setProcessingId(app.id);
        try {
            await processApplication(app);
            await fetchApps();
            alert("承認しました。児童名簿に追加されました。");
        } catch (error) {
            console.error(error);
            alert("処理に失敗しました。");
        } finally {
            setProcessingId(null);
        }
    };

    const newApps = applications.filter(a => a.status === "new");
    const processedApps = applications.filter(a => a.status === "processed");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">入会申請管理</h2>
                <p className="text-muted-foreground">Googleフォームから送信された入会申請を確認・承認します。</p>
            </div>

            <Tabs defaultValue="new" className="w-full">
                <TabsList>
                    <TabsTrigger value="new" className="relative">
                        未処理
                        {newApps.length > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {newApps.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="processed">承認済み履歴</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>未処理の申請</CardTitle>
                            <CardDescription>内容を確認し、「承認」ボタンで児童名簿に追加してください。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
                            ) : newApps.length === 0 ? (
                                <div className="text-center p-10 text-muted-foreground bg-gray-50 rounded-lg">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    現在、未処理の申請はありません。
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {newApps.map(app => (
                                        <Card key={app.id} className="overflow-hidden border-l-4 border-l-blue-500">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">新規申請</Badge>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {app.submissionDate?.seconds ? new Date(app.submissionDate.seconds * 1000).toLocaleString() : "日時不明"}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-xl font-bold">
                                                                    {app.childLastName} {app.childFirstName}
                                                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                                                        ({app.childLastNameKana} {app.childFirstNameKana})
                                                                    </span>
                                                                </h3>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground text-xs">新学年</p>
                                                                <p className="font-medium">{app.grade}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground text-xs">保護者氏名</p>
                                                                <p className="font-medium">{app.guardianLastName} {app.guardianFirstName}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground text-xs">電話番号</p>
                                                                <p className="font-medium">{app.phone}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground text-xs">メールアドレス</p>
                                                                <p className="font-medium">{app.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end">
                                                        <Button
                                                            onClick={() => handleApprove(app)}
                                                            disabled={processingId === app.id}
                                                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            {processingId === app.id ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <UserPlus className="mr-2 h-4 w-4" />
                                                            )}
                                                            承認して名簿に追加
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="processed" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>承認済み履歴</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>申請日時</TableHead>
                                        <TableHead>児童名</TableHead>
                                        <TableHead>保護者名</TableHead>
                                        <TableHead>ステータス</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedApps.map(app => (
                                        <TableRow key={app.id}>
                                            <TableCell className="text-xs">
                                                {app.submissionDate?.seconds ? new Date(app.submissionDate.seconds * 1000).toLocaleDateString() : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {app.childLastName} {app.childFirstName}
                                            </TableCell>
                                            <TableCell>
                                                {app.guardianLastName} {app.guardianFirstName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    承認済み
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {processedApps.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground p-4">
                                                履歴はありません
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
