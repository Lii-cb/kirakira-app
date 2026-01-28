"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ChevronRight } from "lucide-react";

export default function GuardianDocumentsPage() {
    // Mock Data
    const notices = [
        { id: 1, title: "【重要】台風接近に伴う対応について", date: "2026/01/25", tag: "重要", isNew: true },
        { id: 2, title: "2月の給食メニュー・おやつ表", date: "2026/01/20", tag: "献立", isNew: true },
        { id: 3, title: "インフルエンザの流行状況について", date: "2026/01/15", tag: "お知らせ", isNew: false },
        { id: 4, title: "学童だより 1月号", date: "2026/01/01", tag: "お便り", isNew: false },
        { id: 5, title: "年末年始の閉所日のお知らせ", date: "2025/12/10", tag: "お知らせ", isNew: false },
    ];

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <h2 className="text-xl font-bold px-2">お便り・お知らせ</h2>

            <div className="space-y-2">
                {notices.map((notice) => (
                    <Card key={notice.id} className="hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-primary/50">
                        <CardContent className="p-4 flex items-start gap-3">
                            <div className="mt-1 bg-gray-100 p-2 rounded-full">
                                <FileText className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">{notice.date}</span>
                                    <Badge variant="outline" className="text-[10px] h-5 px-1 py-0">{notice.tag}</Badge>
                                    {notice.isNew && (
                                        <Badge variant="default" className="text-[10px] h-5 px-1 py-0 bg-red-500 hover:bg-red-600">NEW</Badge>
                                    )}
                                </div>
                                <h3 className="font-medium text-sm leading-snug line-clamp-2">{notice.title}</h3>
                            </div>
                            <div className="self-center text-gray-300">
                                <ChevronRight className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="px-2 mt-8">
                <h3 className="font-semibold text-lg mb-3">書類のダウンロード</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <Card className="hover:bg-blue-50 cursor-pointer border-dashed">
                        <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                            <Download className="h-8 w-8 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700">利用申込書</span>
                        </CardContent>
                    </Card>
                    <Card className="hover:bg-blue-50 cursor-pointer border-dashed">
                        <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                            <Download className="h-8 w-8 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700">就労証明書</span>
                        </CardContent>
                    </Card>
                </div>

                <h3 className="font-semibold text-lg mb-3">提出について</h3>
                <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-4 space-y-3">
                        <p className="text-sm text-gray-700">
                            記入済みの書類は、以下のボタンからメールに添付して送信してください。<br />
                            <span className="text-xs text-muted-foreground">※ カメラで撮影した画像でも受付け可能です。</span>
                        </p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = "mailto:staff@kirakira.example.com?subject=書類提出（児童名）&body=添付ファイルにて書類を提出します。"}>
                            <FileText className="mr-2 h-4 w-4" />
                            メールで提出する
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
