"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, CalendarDays, Wallet, FileText } from "lucide-react";

export default function GuardianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { href: "/guardian/home", label: "ホーム", icon: Home },
        { href: "/guardian/reserve", label: "予約", icon: CalendarDays },
        { href: "/guardian/payment", label: "支払い", icon: Wallet },
        { href: "/guardian/documents", label: "お便り", icon: FileText },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 pb-16 md:pb-0">
            {/* Header */}
            <header className="bg-white border-b p-4 sticky top-0 z-10 flex justify-between items-center bg-opacity-90 backdrop-blur-sm">
                <h1 className="text-lg font-bold text-primary">KiraKira</h1>
                <Link href="/admin/dashboard" className="text-[10px] text-gray-400 hover:text-gray-600 border px-2 py-1 rounded hover:bg-gray-50">
                    管理者画面へ
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4">
                {children}
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 md:hidden">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors",
                            pathname.startsWith(item.href)
                                ? "text-primary bg-primary/5"
                                : "text-muted-foreground hover:bg-gray-100"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Desktop Navigation (Simple Header Links for now, focus on Mobile) */}
            <div className="hidden md:block fixed top-4 right-4 space-x-4">
                {/* Placeholder for Desktop Nav if needed */}
            </div>
        </div>
    );
}
