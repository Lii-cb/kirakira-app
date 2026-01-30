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
        // Updated Header: Emails joined by semicolon
        const header = "ID,学年,クラス,氏名,かな,帰宅方法,許可メール(セミコロン区分),おやつ免除(1=免除)\n";
        const rows = children.map(c =>
            `${c.id},${c.grade},${c.className || ""},${c.name},${c.kana},${c.defaultReturnMethod},"${(c.authorizedEmails || []).join(";")}",${c.snackConfig?.isExempt ? "1" : "0"}`
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

        if (!confirm("CSVファイルからデータをインポートしますか？\n※ IDが一致する場合は上書き更新されます。")) {
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r\n|\n/);

            let count = 0;
            let updatedCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                // Skip header based on content detection
                if (line.includes("氏名") && line.includes("学年")) continue;

                // Simple split (Assumption: Emails separated by SEMICOLON, not comma)
                // Remove quotes from line purely for parsing simplicity (crude but effective for this app)
                const cleanLine = line.replace(/"/g, "");
                const cols = cleanLine.split(",");

                // Format: ID, Grade, Class, Name, Kana, Method, Emails, Snack
                let id = "", grade = "1", className = "", name = "", kana = "", method = "お迎え", emailStr = "", snackExempt = "0";

                if (cols.length >= 6) {
                    // ID exists
                    [id, grade, className, name, kana, method, emailStr, snackExempt] = cols;
                } else {
                    // Fallback (Older formats)
                    [grade, className, name, kana, method] = cols;
                }

                if (!name) continue;

                // Parse Emails
                const authorizedEmails = emailStr
                    ? emailStr.split(";").map(e => e.trim()).filter(e => e)
                    : [];

                // Clean data
                const childData: any = {
                    grade: parseInt(grade) || 1,
                    className: className?.trim() || "",
                    name: name?.trim() || "",
                    kana: kana?.trim() || "",
                    defaultReturnMethod: (method?.trim() as any) || "お迎え",
                    authorizedEmails: authorizedEmails,
                    snackConfig: {
                        isExempt: snackExempt?.trim() === "1"
                    }
                };

                try {
                    if (id && id.trim()) {
                        // Update existing
                        await updateChild(id.trim(), childData);
                        updatedCount++;
                    } else {
                        // Add new
                        await addChild(childData);
                        count++;
                    }
                } catch (err) {
                    console.error("Import error line " + i, err);
                }
            }
            alert(`${count}件登録、${updatedCount}件更新しました。`);
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
                        CSV形式: ID, 学年, クラス, 氏名, かな, 帰宅方法, "メール1,メール2", おやつ免除(1/0)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>学年/クラス</TableHead>
                                    <TableHead>氏名</TableHead>
                                    <TableHead>ふりがな</TableHead>
                                    <TableHead>パスワード(廃止)</TableHead>
                                    <TableHead>許可メール</TableHead>
                                    <TableHead>通常帰宅方法</TableHead>
                                    <TableHead>おやつ設定</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {children.map((child) => (
                                    <TableRow key={child.id}>
                                        <TableCell className="text-xs text-muted-foreground">{child.id}</TableCell>
                                        <TableCell>{child.grade}年 {child.className}</TableCell>
                                        <TableCell className="font-medium">{child.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{child.kana}</TableCell>
                                        <TableCell className="text-xs font-mono">-</TableCell>
                                        <TableCell className="text-xs max-w-[150px] truncate" title={(child.authorizedEmails || []).join(", ")}>
                                            {(child.authorizedEmails || []).length > 0 ? (child.authorizedEmails || [])[0] + ((child.authorizedEmails || []).length > 1 ? "..." : "") : "-"}
                                        </TableCell>
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
