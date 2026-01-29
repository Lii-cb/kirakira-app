"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getChildren, addChild, updateChild } from "@/lib/firestore";
import { Child } from "@/types/firestore";
import { Loader2, Download, Upload, FileUp, Cookie } from "lucide-react";

export default function AdminUsersPage() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchChildren = async () => {
        setLoading(true);
        try {
            const data = await getChildren();
            setChildren(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChildren();
    }, []);

    const handleSnackToggle = async (child: Child) => {
        const newIsExempt = !child.snackConfig?.isExempt;

        // Optimistic update
        setChildren(prev => prev.map(c =>
            c.id === child.id
                ? { ...c, snackConfig: { isExempt: newIsExempt } }
                : c
        ));

        try {
            await updateChild(child.id, {
                snackConfig: { isExempt: newIsExempt }
            });
        } catch (e) {
            console.error(e);
            alert("更新に失敗しました。");
            fetchChildren(); // Revert
        }
    };

    // CSV Export
    const handleExport = () => {
        const header = "学年,クラス,氏名,かな,帰宅方法(お迎え/集団下校/バス/徒歩)\n";
        const rows = children.map(c =>
            `${c.grade},${c.className || ""},${c.name},${c.kana},${c.defaultReturnMethod}`
        ).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `児童名簿_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // CSV Import
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("CSVファイルからデータをインポートしますか？\n※ 既存のデータに追加されます。")) {
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r\n|\n/);
            // Skip header if it contains specific keywords, or just assume first line is header if desired. 
            // Here, trusting user follows format. Simple implementation:

            let count = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                // Skip header based on content detection
                if (line.includes("氏名") && line.includes("学年")) continue;

                const cols = line.split(",");
                if (cols.length < 4) continue; // Basic validation

                const [grade, className, name, kana, method] = cols;

                try {
                    await addChild({
                        id: "", // generated
                        grade: parseInt(grade) || 1,
                        className: className?.trim() || "",
                        name: name?.trim() || "",
                        kana: kana?.trim() || "",
                        defaultReturnMethod: (method?.trim() as any) || "お迎え"
                    });
                    count++;
                } catch (err) {
                    console.error("Import error line " + i, err);
                }
            }
            alert(`${count}件のデータをインポートしました。`);
            fetchChildren(); // Refresh
            e.target.value = ""; // Reset input
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">児童・利用者名簿</h2>
                <div className="flex gap-2">
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        CSVインポート
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        CSVエクスポート
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>登録児童一覧</CardTitle>
                    <CardDescription>
                        現在登録されている児童の名簿です。<br />
                        CSVフォーマット: 学年, クラス, 氏名, かな, 帰宅方法
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>学年/クラス</TableHead>
                                    <TableHead>氏名</TableHead>
                                    <TableHead>ふりがな</TableHead>
                                    <TableHead>通常帰宅方法</TableHead>
                                    <TableHead>おやつ設定</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {children.map((child) => (
                                    <TableRow key={child.id}>
                                        <TableCell>{child.grade}年 {child.className}</TableCell>
                                        <TableCell className="font-medium">{child.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{child.kana}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{child.defaultReturnMethod}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id={`snack-${child.id}`}
                                                    checked={!child.snackConfig?.isExempt}
                                                    onCheckedChange={() => handleSnackToggle(child)}
                                                    className="data-[state=checked]:bg-orange-500"
                                                />
                                                <Label htmlFor={`snack-${child.id}`} className="text-sm text-gray-600">
                                                    {child.snackConfig?.isExempt ? (
                                                        <span className="text-muted-foreground text-xs">なし</span>
                                                    ) : (
                                                        <span className="text-orange-600 font-bold text-xs flex items-center"><Cookie className="w-3 h-3 mr-1" />あり</span>
                                                    )}
                                                </Label>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
