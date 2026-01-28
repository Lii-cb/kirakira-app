"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Upload, Trash2 } from "lucide-react";

export default function AdminDocumentsPage() {
    const publishedDocs = [
        { id: 1, title: "1月の給食献立表", date: "2026-01-20", downloads: 45 },
        { id: 2, title: "学童だより 1月号", date: "2026-01-01", downloads: 98 },
        { id: 3, title: "入所申込みの案内", date: "2025-12-01", downloads: 120 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">書類・お便り管理</h2>
                <p className="text-muted-foreground">保護者向けのお便りや配布資料を管理します。</p>
            </div>

            <Tabs defaultValue="list" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="list">公開中の書類</TabsTrigger>
                    <TabsTrigger value="create">新規作成・アップロード</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {publishedDocs.map((doc) => (
                            <Card key={doc.id}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-100 p-2 rounded">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <CardTitle className="text-sm font-medium line-clamp-1">{doc.title}</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground mt-2">公開日: {doc.date}</div>
                                    <div className="text-xs text-muted-foreground">ダウンロード数: {doc.downloads}回</div>
                                </CardContent>
                            </Card>
                        ))}
                        <Card className="flex flex-col items-center justify-center border-dashed cursor-pointer hover:bg-gray-50 h-[120px]">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Plus className="h-8 w-8" />
                                <span className="text-sm">新規追加</span>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="create">
                    <Card>
                        <CardHeader>
                            <CardTitle>新規お便り作成</CardTitle>
                            <CardDescription>PDFファイルをアップロードするか、テキストでお知らせを作成します。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">タイトル</Label>
                                <Input id="title" placeholder="例：2月の行事予定について" />
                            </div>
                            <div className="space-y-2">
                                <Label>ファイル (PDF/画像)</Label>
                                <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-muted-foreground hover:bg-gray-50 cursor-pointer">
                                    <Upload className="h-8 w-8 mb-2" />
                                    <span>クリックしてファイルをアップロード</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">詳細・本文 (任意)</Label>
                                <Textarea id="description" placeholder="保護者へのメッセージがあれば入力..." />
                            </div>
                            <div className="flex justify-end">
                                <Button>公開する</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
