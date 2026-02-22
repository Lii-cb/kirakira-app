"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSystemSettings, updateSystemSettings } from "@/lib/firestore";
import { SystemSettings } from "@/types/firestore";
import { Spinner } from "@/components/ui/spinner";

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getSystemSettings();
                setSettings(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleToggle = async (
        section: "notifications" | "features",
        key: string,
        value: boolean
    ) => {
        if (!settings) return;

        // Optimistic Update
        const newSettings = { ...settings };
        if (section === "notifications") {
            newSettings.notifications = {
                ...newSettings.notifications,
                [key]: value,
                emailEnabled: newSettings.notifications?.emailEnabled ?? true,
            };
        } else if (section === "features") {
            newSettings.features = {
                ...newSettings.features,
                [key]: value,
                newReservationsEnabled: newSettings.features?.newReservationsEnabled ?? true
            };
        }
        setSettings(newSettings);

        try {
            await updateSystemSettings(newSettings);
        } catch (error) {
            console.error("Failed to update settings", error);
            // Revert (Simplified: Fetch again)
            const data = await getSystemSettings();
            setSettings(data);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">設定</h2>
                <p className="text-muted-foreground">システムの基本設定を行います。</p>
            </div>

            <div className="grid gap-6">
                {/* 
                <Card>
                    <CardHeader>
                        <CardTitle>施設情報</CardTitle>
                        <CardDescription>施設名や連絡先の設定（現在は固定表示）</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="facilityName">施設名</Label>
                            <Input id="facilityName" defaultValue="キラキラ放課後児童クラブ" disabled />
                        </div>
                    </CardContent>
                </Card>
                */}

                <Card>
                    <CardHeader>
                        <CardTitle>外部連携（スプレッドシート自動同期）</CardTitle>
                        <CardDescription>Googleスプレッドシートとの自動連携設定</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-gray-600">
                            <p>本システムはGoogle Apps Scriptと連携して動作しています。</p>
                            <p className="mt-2 font-bold">連携手順:</p>
                            <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
                                <li>詳細手順書を開く</li>
                                <li>スプレッドシートに「Firestore for Google Apps Script」ライブラリを追加</li>
                                <li>Firebaseコンソールから「サービスアカウントキー(JSON)」を取得</li>
                                <li>スクリプトにキーを貼り付けて実行</li>
                            </ol>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">※ 詳細な設定手順は管理者にお問い合わせください。</p>
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
                            <Switch
                                checked={settings?.notifications?.emailEnabled ?? true}
                                onCheckedChange={(c) => handleToggle("notifications", "emailEnabled", c)}
                            />
                        </div>
                        {/* 
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>新規予約受付</Label>
                                <div className="text-sm text-muted-foreground">保護者からの新規予約を受け付ける</div>
                            </div>
                            <Switch
                                checked={settings?.features?.newReservationsEnabled ?? true}
                                onCheckedChange={(c) => handleToggle("features", "newReservationsEnabled", c)}
                            />
                        </div>
                        */}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>管理者モード切替 PIN</CardTitle>
                        <CardDescription>管理者モードへ切り替える際のPINコードを設定します</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="adminPin">PINコード</Label>
                                <Input
                                    id="adminPin"
                                    type="password"
                                    defaultValue={settings?.adminPin || ""}
                                    placeholder="4桁以上の数字"
                                    onBlur={async (e) => {
                                        const pin = e.target.value.trim();
                                        if (pin && pin.length >= 4) {
                                            try {
                                                await updateSystemSettings({ adminPin: pin });
                                                alert("PINを更新しました。");
                                            } catch (error) {
                                                console.error(error);
                                                alert("PINの更新に失敗しました。");
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">※ スプレッドシートのSettingsシートからも設定可能です。</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
