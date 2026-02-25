"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Calendar, Banknote, FileText, LogOut, Settings, LogIn } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { StaffNotificationProvider } from "@/contexts/staff-notification-context";
import { auth } from "@/lib/firebase/client";
import { getSystemSettings, getPendingReservationsCount } from "@/lib/firestore";
import { StaffNotificationToast } from "@/components/admin/staff-notification-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AdminModeProvider, useAdminMode } from "@/contexts/admin-mode-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { mode, setMode } = useAdminMode();
    const { role, loading } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const unsubscribe = getPendingReservationsCount(count => setPendingCount(count));
        return () => unsubscribe();
    }, []);

    // RBAC Check
    useEffect(() => {
        if (!loading) {
            if (role !== 'admin' && role !== 'staff') {
                router.push('/login');
            }
        }
    }, [role, loading, router]);

    const handleModeSwitch = async (checked: boolean) => {
        if (role !== 'admin') {
            alert("管理者権限が必要です。");
            return;
        }

        if (checked) {
            // Switching to admin mode — require PIN
            try {
                const settings = await getSystemSettings();
                const storedPin = settings?.adminPin;
                if (storedPin) {
                    const inputPin = prompt("管理者PINを入力してください:");
                    if (inputPin !== storedPin) {
                        alert("PINが正しくありません。");
                        return;
                    }
                }
                setMode('admin');
            } catch (error) {
                console.error("Failed to fetch PIN:", error);
                alert("設定の取得に失敗しました。");
            }
        } else {
            setMode('staff');
        }
    };

    if (loading || (role !== 'admin' && role !== 'staff')) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner className="text-blue-500" />
            </div>
        );
    }

    const navItems = [
        { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
        // { href: "/admin/applications", label: "入会申請", icon: FileText }, // Removed
        { href: "/admin/calendar", label: "予約台帳", icon: Calendar },
        { href: "/admin/users", label: "児童名簿", icon: Users },
        { href: "/admin/finance", label: "金銭管理", icon: Banknote },
        { href: "/admin/documents", label: "書類管理", icon: FileText },
        { href: "/staff/home", label: "職員ポータル", icon: LogIn },
        { href: "/admin/settings", label: "システム設定", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold tracking-tight text-primary">きらきら児童クラブ管理</h1>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">Ver 2.2.3</p>
                        <p className="text-[10px] text-muted-foreground/80">ゆめの森放課後児童クラブ</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 bg-gray-50 p-2 rounded-md border">
                        <Switch id="mode-toggle" checked={mode === 'admin'} onCheckedChange={handleModeSwitch} />
                        <Label htmlFor="mode-toggle" className="text-xs font-medium cursor-pointer">
                            {mode === 'admin' ? '管理者モード' : '職員モード'}
                        </Label>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-2 relative", pathname.startsWith(item.href) && "font-bold")}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                                {item.href === "/admin/calendar" && pendingCount > 0 && (
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-in zoom-in">
                                        {pendingCount}
                                    </span>
                                )}
                            </Button>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t space-y-2 flex-shrink-0">
                    <Link href="/parent/home">
                        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary">
                            <Users className="h-4 w-4" />
                            保護者画面へ
                        </Button>
                    </Link>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { auth.signOut(); router.push('/'); }}>
                        <LogOut className="h-4 w-4" />
                        ログアウト
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden mb-16 md:mb-0">
                <StaffNotificationProvider>
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-40">
                        <h1 className="text-sm font-bold text-primary">きらきら管理</h1>
                        <span className="text-sm font-medium text-muted-foreground">
                            {navItems.find(item => pathname.startsWith(item.href))?.label || "管理画面"}
                        </span>
                        <span className="text-[10px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">Ver 2.2.3</span>
                    </div>
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
                <Link href="/admin/calendar" className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg relative", pathname.startsWith("/admin/calendar") ? "text-primary bg-primary/5" : "text-muted-foreground")}>
                    <Calendar className="h-6 w-6" />
                    <span className="text-[10px]">予約</span>
                    {pendingCount > 0 && (
                        <span className="absolute top-1 right-3 bg-red-500 text-white text-[9px] font-bold px-1 py-0 rounded-full min-w-[14px] text-center">
                            {pendingCount}
                        </span>
                    )}
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
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <div className="flex items-center space-x-2 w-full p-1" onClick={(e) => e.stopPropagation()}>
                                <Switch id="mode-toggle-mobile" checked={mode === 'admin'} onCheckedChange={handleModeSwitch} />
                                <Label htmlFor="mode-toggle-mobile" className="text-xs font-medium cursor-pointer flex-1">
                                    {mode === 'admin' ? '管理者モード' : '職員モード'}
                                </Label>
                            </div>
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem asChild>
                            <Link href="/admin/applications" className="w-full flex items-center p-2 cursor-pointer">
                                <FileText className="h-4 w-4 mr-2" /> 入会申請
                            </Link>
                        </DropdownMenuItem> */}
                        <DropdownMenuItem asChild>
                            <Link href="/admin/users" className="w-full flex items-center p-2 cursor-pointer">
                                <Users className="h-4 w-4 mr-2" /> 児童名簿
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/finance" className="w-full flex items-center p-2 cursor-pointer">
                                <Banknote className="h-4 w-4 mr-2" /> 金銭管理
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/staff" className="w-full flex items-center p-2 cursor-pointer">
                                <Users className="h-4 w-4 mr-2" /> 職員管理
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings" className="w-full flex items-center p-2 cursor-pointer">
                                <Settings className="h-4 w-4 mr-2" /> 設定
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="border-t mt-1 text-muted-foreground">
                            <Link href="/parent/home" className="w-full flex items-center p-2 cursor-pointer">
                                <Users className="h-4 w-4 mr-2" /> 保護者画面へ
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>


        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminModeProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminModeProvider>
    );
}
