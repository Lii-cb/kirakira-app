"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, FileText, ExternalLink, Paperclip, Upload, Loader2 } from "lucide-react";
import { addDocument, getDocuments, deleteDocument } from "@/lib/firestore";
import { AppDocument } from "@/types/firestore";

export default function AdminDocumentsPage() {
    const [documents, setDocuments] = useState<AppDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<"news" | "menu" | "event" | "other">("news");
    const [url, setUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const data = await getDocuments();
            setDocuments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        setUploading(true);
        try {
            let base64 = "";
            let fileName = "";

            if (file) {
                if (file.size > 500 * 1024) { // 500KB limit for MVP Base64
                    alert("ファイルサイズが大きすぎます(500KB以下推奨)。外部URLを使用してください。");
                    setUploading(false);
                    return;
                }
                fileName = file.name;
                base64 = await convertToBase64(file);
            }

            await addDocument({
                title,
                category,
                url,
                base64: base64 || undefined,
                fileName: fileName || undefined,
            });

            // Reset
            setTitle("");
            setUrl("");
            setFile(null);
            setCategory("news");
            await fetchDocs();
            alert("登録しました");
        } catch (error) {
            console.error(error);
            alert("登録に失敗しました");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;
        await deleteDocument(id);
        fetchDocs();
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">資料管理</h2>
                <p className="text-muted-foreground">保護者向けのお知らせやPDF資料を管理します。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Registration Form */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>新規登録</CardTitle>
                        <CardDescription>PDFファイルまたはリンクを登録</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>タイトル</Label>
                                <Input
                                    placeholder="〇〇のお知らせ"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>カテゴリ</Label>
                                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="news">お知らせ</SelectItem>
                                        <SelectItem value="menu">献立表</SelectItem>
                                        <SelectItem value="event">イベント</SelectItem>
                                        <SelectItem value="other">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Tabs defaultValue="file" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="file">ファイル</TabsTrigger>
                                    <TabsTrigger value="url">URLリンク</TabsTrigger>
                                </TabsList>
                                <TabsContent value="file" className="space-y-2 pt-2">
                                    <Label>PDF/画像アップロード (500KB以下)</Label>
                                    <Input type="file" accept=".pdf,image/*" onChange={handleFileChange} />
                                    {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
                                </TabsContent>
                                <TabsContent value="url" className="space-y-2 pt-2">
                                    <Label>外部URL (Google Drive等)</Label>
                                    <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
                                </TabsContent>
                            </Tabs>

                            <Button type="submit" className="w-full" disabled={uploading}>
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {uploading ? "登録中..." : "登録する"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>登録済み資料一覧</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
                        ) : documents.length === 0 ? (
                            <div className="text-center p-10 text-muted-foreground">資料はまだありません</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>日付</TableHead>
                                        <TableHead>カテゴリ</TableHead>
                                        <TableHead>タイトル</TableHead>
                                        <TableHead>タイプ</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="whitespace-nowrap font-mono text-sm">
                                                {doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : "---"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    doc.category === "news" ? "bg-blue-50 text-blue-700" :
                                                        doc.category === "menu" ? "bg-orange-50 text-orange-700" :
                                                            doc.category === "event" ? "bg-pink-50 text-pink-700" : ""
                                                }>
                                                    {doc.category === "news" && "お知らせ"}
                                                    {doc.category === "menu" && "献立表"}
                                                    {doc.category === "event" && "イベント"}
                                                    {doc.category === "other" && "その他"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{doc.title}</TableCell>
                                            <TableCell>
                                                {doc.url ? (
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                        リンク
                                                    </a>
                                                ) : doc.base64 ? (
                                                    <a href={doc.base64} download={doc.fileName || "download"} className="flex items-center text-green-600 hover:underline">
                                                        <Paperclip className="w-3 h-3 mr-1" />
                                                        {doc.fileName || "ファイル"}
                                                    </a>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
