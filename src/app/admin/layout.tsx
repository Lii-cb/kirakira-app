"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Calendar, Banknote, FileText, LogOut } from "lucide-react";
import { StaffNotificationProvider } from "@/contexts/staff-notification-context";
import { StaffNotificationToast } from "@/components/admin/staff-notification-toast";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
        { href: "/admin/applications", label: "入会申請", icon: FileText },
        { href: "/admin/calendar", label: "予約台帳", icon: Calendar },
        { href: "/admin/users", label: "児童・利用者", icon: Users },
        { href: "/admin/finance", label: "金銭管理", icon: Banknote },
        { href: "/admin/documents", label: "書類管理", icon: FileText },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold tracking-tight text-primary">KiraKira Manager</h1>
                    <p className="text-xs text-muted-foreground">放課後児童クラブ管理</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-2", pathname.startsWith(item.href) && "font-bold")}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t space-y-2">
                    <Link href="/guardian/home">
                        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary">
                            <Users className="h-4 w-4" />
                            保護者画面へ
                        </Button>
                    </Link>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" />
                        ログアウト
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden mb-16 md:mb-0">
                <StaffNotificationProvider>
                    {/* Mobile Header (TODO) */}
                    <div className="flex-1 overflow-auto p-4 md:p-8">
                        {children}
                    </div>
                    <StaffNotificationToast />
                </StaffNotificationProvider>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 md:hidden z-50">
                <Link href="/admin/dashboard" className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg", pathname === "/admin/dashboard" ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="text-[10px]">ホーム</span>
                </Link>
                <Link href="/admin/calendar" className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg", pathname.startsWith("/admin/calendar") ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                    <Calendar className="h-6 w-6" />
                    <span className="text-[10px]">予約</span>
                </Link>
                <Link href="/admin/users" className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg", pathname.startsWith("/admin/users") ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                    <Users className="h-6 w-6" />
                    <span className="text-[10px]">名簿</span>
                </Link>
                <Link href="/guardian/home" className="flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg text-muted-foreground hover:bg-gray-100">
                    <Users className="h-6 w-6" />
                    <span className="text-[10px]">保護者</span>
                </Link>
            </nav>
        </div>
    );
}
