"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getChildren } from "@/lib/firestore";
import { Child } from "@/types/firestore";
import { Loader2, User } from "lucide-react";

export default function AdminUsersPage() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const data = await getChildren();
                setChildren(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">児童・利用者名簿</h2>
            <Card>
                <CardHeader>
                    <CardTitle>登録児童一覧</CardTitle>
                    <CardDescription>現在登録されている児童の名簿です。</CardDescription>
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
