"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Calendar, Banknote, FileText, LogOut, Settings } from "lucide-react";
import { StaffNotificationProvider } from "@/contexts/staff-notification-context";
import { StaffNotificationToast } from "@/components/admin/staff-notification-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        { href: "/admin/settings", label: "設定", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold tracking-tight text-primary">KiraKira Manager</h1>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">Ver2.4</p>
                        <p className="text-[10px] text-muted-foreground/80">放課後児童クラブ管理</p>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                <div className="p-4 border-t space-y-2 flex-shrink-0">
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
                <Link href="/admin/documents" className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg", pathname.startsWith("/admin/documents") ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                    <FileText className="h-6 w-6" />
                    <span className="text-[10px]">書類</span>
                </Link>

                {/* Mobile Settings Menu (Drawer-like) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg cursor-pointer", pathname.search(/\/admin\/(settings|applications|users|finance)/) !== -1 ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                            <Settings className="h-6 w-6" />
                            <span className="text-[10px]">設定</span>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mb-2">
                        <DropdownMenuItem asChild>
                            <Link href="/admin/applications" className="w-full flex items-center p-2 cursor-pointer">
                                <FileText className="h-4 w-4 mr-2" /> 入会申請
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/users" className="w-full flex items-center p-2 cursor-pointer">
                                <Users className="h-4 w-4 mr-2" /> 児童・利用者
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/finance" className="w-full flex items-center p-2 cursor-pointer">
                                <Banknote className="h-4 w-4 mr-2" /> 金銭管理
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings" className="w-full flex items-center p-2 cursor-pointer">
                                <Settings className="h-4 w-4 mr-2" /> 設定
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="border-t mt-1 text-muted-foreground">
                            <Link href="/guardian/home" className="w-full flex items-center p-2 cursor-pointer">
                                <Users className="h-4 w-4 mr-2" /> 保護者画面へ
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>
        </div>
    );
}
