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
import { Spinner } from "@/components/ui/spinner";
import { Download, Upload, Cookie } from "lucide-react";

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
        // Updated Header: Added Guardian Name and Phones
        const header = "ID,学年,氏名,かな,帰宅方法,許可メール(セミコロン区分),電話番号(セミコロン区分),おやつ免除(1=免除)\n";
        const rows = children.map(c =>
            `${c.id},${c.grade},${c.name},${c.kana},${c.defaultReturnMethod},"${(c.authorizedEmails || []).join(";")}","${(c.phoneNumbers || []).join(";")}",${c.snackConfig?.isExempt ? "1" : "0"}`
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
                const cleanLine = line.replace(/"/g, "");
                const cols = cleanLine.split(",");

                // Format: ID, Grade, Name, Kana, Method, Emails, Phones, Snack
                let id = "", grade = "1", name = "", kana = "", method = "お迎え", emailStr = "", phoneStr = "", snackExempt = "0";

                if (cols.length >= 8) {
                    // New Format: ID, Grade, Name, Kana, Method, Emails, Phones, Snack
                    [id, grade, name, kana, method, emailStr, phoneStr, snackExempt] = cols;
                } else if (cols.length >= 6) {
                    // Minimal Format
                    [id, grade, name, kana, method, emailStr, snackExempt] = cols;
                } else {
                    // Fallback
                    [grade, name, kana, method] = cols;
                }

                if (!name) continue;

                // Parse Emails & Phones
                const authorizedEmails = emailStr
                    ? emailStr.split(";").map(e => e.trim()).filter(e => e)
                    : [];
                const phoneNumbers = phoneStr
                    ? phoneStr.split(";").map(p => p.trim()).filter(p => p)
                    : [];

                // Clean data
                const childData: Partial<Child> = {
                    grade: parseInt(grade) || 1,
                    name: name?.trim() || "",
                    kana: kana?.trim() || "",
                    defaultReturnMethod: (method?.trim() as Child['defaultReturnMethod']) || "お迎え",
                    authorizedEmails: authorizedEmails,
                    phoneNumbers: phoneNumbers,
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">児童名簿</h2>
                    <p className="text-muted-foreground">CSVによる一括管理と個別の設定変更が可能です。</p>
                </div>
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
                        CSV形式: ID, 学年, 氏名, かな, 帰宅方法, 許可メール, 電話番号, おやつ免除
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-10"><Spinner /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>学年</TableHead>
                                    <TableHead>氏名</TableHead>
                                    <TableHead>連絡先</TableHead>
                                    <TableHead>許可メール</TableHead>
                                    <TableHead>通常帰宅方法</TableHead>
                                    <TableHead>おやつ設定</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {children.map((child) => (
                                    <TableRow key={child.id}>
                                        <TableCell className="text-xs text-muted-foreground">{child.id}</TableCell>
                                        <TableCell>{child.grade}年</TableCell>
                                        <TableCell className="font-medium">
                                            <button
                                                type="button"
                                                onClick={() => { window.location.href = `/parent/home/?childId=${child.id}`; }}
                                                className="text-blue-600 hover:underline font-bold text-left"
                                            >
                                                {child.name || (child as any).fullName || (child as any).氏名 || "名前なし"}
                                            </button>
                                            <br />
                                            <span className="text-xs text-muted-foreground">{child.kana}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                {(child.phoneNumbers || []).map((phone, idx) => (
                                                    <a key={idx} href={`tel:${phone}`} className="text-blue-600 hover:underline flex items-center">
                                                        📞 {phone}
                                                    </a>
                                                ))}
                                            </div>
                                        </TableCell>
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
