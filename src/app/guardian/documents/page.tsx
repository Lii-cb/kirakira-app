"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Download, File, Loader2 } from "lucide-react";
import { getDocuments } from "@/lib/firestore";
import { AppDocument } from "@/types/firestore";

export default function GuardianDocumentsPage() {
    const [documents, setDocuments] = useState<AppDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const data = await getDocuments();
                setDocuments(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, []);

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case "news": return "お知らせ";
            case "event": return "イベント";
            case "other": return "その他";
            default: return cat;
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case "news": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
            case "event": return "bg-pink-100 text-pink-700 hover:bg-pink-100";
            default: return "bg-gray-100 text-gray-700 hover:bg-gray-100";
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800">資料・お知らせ</h2>
                <p className="text-sm text-gray-500">学童からのお知らせや配布資料を確認できます。</p>
            </div>

            <div className="space-y-3">
                {documents.length === 0 ? (
                    <div className="text-center p-10 text-muted-foreground bg-white rounded-lg border">
                        現在、公開されている資料はありません。
                    </div>
                ) : (
                    documents.map((doc) => (
                        <Card key={doc.id} className="overflow-hidden">
                            <CardContent className="p-4 flex items-start gap-3">
                                <div className="mt-1">
                                    {doc.category === "event" ? <FileText className="w-8 h-8 text-pink-500" /> :
                                        <FileText className="w-8 h-8 text-blue-500" />}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" className={`text-xs ${getCategoryColor(doc.category)}`}>
                                            {getCategoryLabel(doc.category)}
                                        </Badge>
                                        <span className="text-xs text-gray-400">
                                            {doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : ""}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 leading-tight">{doc.title}</h3>
                                    <div className="pt-2">
                                        {doc.url ? (
                                            <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-3 h-3" />
                                                    リンクを開く
                                                </a>
                                            </Button>
                                        ) : doc.base64 ? (
                                            <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-green-600 border-green-200 bg-green-50 hover:bg-green-100">
                                                <a href={doc.base64} download={doc.fileName || "document"}>
                                                    <Download className="w-3 h-3" />
                                                    ダウンロード {doc.fileName && <span className="text-xs opacity-70 ml-1 truncate max-w-[100px]">({doc.fileName})</span>}
                                                </a>
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
