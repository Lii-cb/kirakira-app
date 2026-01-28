"use client";

import { useStaffNotifications } from "@/contexts/staff-notification-context";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StaffNotificationToast() {
    const { notifications, replyCall, completeCall } = useStaffNotifications();

    if (notifications.length === 0) return null;

    // Show the oldest active notification first (queue style)
    const notification = notifications[0];

    // Check if it already has a reply
    const hasReply = !!notification.reply;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5">
            <Card className={`shadow-xl border-l-4 ${hasReply ? "border-l-green-500" : "border-l-orange-500"}`}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${hasReply ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600 animate-pulse"}`}>
                                <Bell className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">お迎え呼び出し</CardTitle>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(notification.createdAt?.seconds * 1000).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                        {hasReply && (
                            <Button variant="ghost" size="sm" onClick={() => completeCall(notification.id)}>
                                完了
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="text-2xl font-bold text-center py-2">
                        {notification.childName} <span className="text-sm font-normal">さん</span>
                    </div>

                    {hasReply ? (
                        <div className="bg-green-50 p-3 rounded-lg flex items-center justify-center gap-2 text-green-800 font-bold">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>{notification.reply} で確認</span>
                        </div>
                    ) : (
                        <p className="text-center text-sm text-muted-foreground animate-pulse">
                            職員は現在地を知らせてください
                        </p>
                    )}
                </CardContent>

                {!hasReply && (
                    <CardFooter className="grid grid-cols-3 gap-2 pt-2">
                        <Button variant="outline" className="flex flex-col h-16 gap-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={() => replyCall(notification.id, "アリーナ")}>
                            <MapPin className="h-4 w-4" />
                            <span className="text-xs">アリーナ</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-16 gap-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => replyCall(notification.id, "外")}>
                            <MapPin className="h-4 w-4" />
                            <span className="text-xs">外</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-16 gap-1 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200" onClick={() => replyCall(notification.id, "探します")}>
                            <Search className="h-4 w-4" />
                            <span className="text-xs">探します</span>
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
