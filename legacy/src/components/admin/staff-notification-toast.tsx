"use client";

import { useStaffNotifications } from "@/contexts/staff-notification-context";
import { Button } from "@/components/ui/button";
import { Bell, X, Phone, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StaffNotificationToast() {
    const { notifications, cancelCall, addAction } = useStaffNotifications();

    if (notifications.length === 0) return null;

    // Show all active notifications
    return (
        <div className="fixed inset-0 z-50 bg-red-600/90 backdrop-blur-sm flex flex-col items-center justify-start p-4 overflow-y-auto animate-in fade-in duration-300">
            {notifications.map((notification) => {
                const actions: { type: string; staffName: string; timestamp: string }[] = (notification as any).actions || [];

                return (
                    <div key={notification.id} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl mb-4 overflow-hidden border-4 border-red-300">
                        {/* Header */}
                        <div className="bg-red-50 px-4 py-3 flex items-center justify-between border-b border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500 text-white p-2 rounded-full animate-pulse">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-red-800">お迎え呼び出し</h3>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 font-mono">
                                {notifications.length > 1 ? `${notifications.indexOf(notification) + 1}/${notifications.length}` : "ALERT"}
                            </Badge>
                        </div>

                        {/* Child Name */}
                        <div className="text-center py-4 bg-white">
                            <div className="text-3xl font-black text-gray-900">
                                {notification.childName}
                                <span className="text-base font-normal text-gray-500 ml-1">さん</span>
                            </div>
                        </div>

                        {/* Action Log */}
                        {actions.length > 0 && (
                            <div className="px-4 pb-2 space-y-1">
                                {actions.map((action, idx) => (
                                    <div key={idx} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${action.type === "calling" ? "bg-blue-50 text-blue-800 border border-blue-100" :
                                            action.type === "done" ? "bg-green-50 text-green-800 border border-green-100" :
                                                "bg-gray-50 text-gray-700"
                                        }`}>
                                        {action.type === "calling" && <Phone className="h-3 w-3" />}
                                        {action.type === "done" && <CheckCircle2 className="h-3 w-3" />}
                                        <span className="font-bold">{action.staffName}</span>
                                        <span className="text-xs opacity-70">
                                            {action.type === "calling" ? "「今呼びます」" : "「完了」"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="p-4 grid grid-cols-3 gap-2 border-t bg-gray-50">
                            <Button
                                className="flex flex-col gap-1 h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                onClick={() => addAction(notification.id, "calling", "スタッフ")}
                            >
                                <Phone className="h-5 w-5" />
                                <span className="text-xs">今呼びます</span>
                            </Button>
                            <Button
                                className="flex flex-col gap-1 h-16 bg-green-600 hover:bg-green-700 text-white font-bold"
                                onClick={() => addAction(notification.id, "done", "スタッフ")}
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="text-xs">完了</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex flex-col gap-1 h-16 text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-bold"
                                onClick={() => cancelCall(notification.id)}
                            >
                                <X className="h-5 w-5" />
                                <span className="text-xs">取り消し</span>
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
