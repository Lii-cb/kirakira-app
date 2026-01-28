"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">設定</h2>
                <p className="text-muted-foreground">システムの基本設定を行います。</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>施設情報</CardTitle>
                        <CardDescription>施設名や連絡先の設定</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="facilityName">施設名</Label>
                            <Input id="facilityName" defaultValue="キラキラ放課後児童クラブ" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">住所</Label>
                            <Input id="address" defaultValue="東京都渋谷区..." />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">電話番号</Label>
                            <Input id="phone" defaultValue="03-1234-5678" />
                        </div>
                        <Button>保存する</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>外部連携（スプレッドシート自動同期）</CardTitle>
                        <CardDescription>Googleスプレッドシートとの自動連携設定</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-md space-y-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">APIエンドポイント</Label>
                                <div className="font-mono text-sm break-all bg-white border p-2 rounded">
                                    https://kirakira-app-cc454.web.app/api/children
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">APIシークレット</Label>
                                <div className="font-mono text-sm break-all bg-white border p-2 rounded">
                                    kirakira-api-key-2026
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600">
                            <p>本システムはサーバーレス構成のため、Google Apps Scriptから直接データベースを読み取る方式を採用しています。</p>
                            <p className="mt-2 font-bold">連携手順:</p>
                            <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
                                <li>詳細手順書を開く</li>
                                <li>スプレッドシートに「Firestore for Google Apps Script」ライブラリを追加</li>
                                <li>Firebaseコンソールから「サービスアカウントキー(JSON)」を取得</li>
                                <li>スクリプトにキーを貼り付けて実行</li>
                            </ol>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => window.open('/SPREADSHEET_INTEGRATION.md', '_blank')}>
                            詳細な手順書を開く
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>システム設定</CardTitle>
                        <CardDescription>通知や機能のオンオフ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>入退室通知メール</Label>
                                <div className="text-sm text-muted-foreground">保護者へ入退室時にメールを送信する</div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>LINE連携</Label>
                                <div className="text-sm text-muted-foreground">LINEでの通知を有効にする</div>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>新規予約受付</Label>
                                <div className="text-sm text-muted-foreground">保護者からの新規予約を受け付ける</div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
