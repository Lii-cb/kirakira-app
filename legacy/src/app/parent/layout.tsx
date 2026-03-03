"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, CalendarDays, Wallet, FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, Suspense } from "react";

function ParentLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const childId = searchParams.get("childId");
    const { user, role, loading } = useAuth();

    // Protect routes
    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Not logged in -> Redirect to login
                // (Allow access to login page itself)
                if (pathname !== "/parent/login") {
                    router.push("/parent/login");
                }
            } else {
                // Logged in
                // Check if user has permission (parent or admin/staff)
                if (role === "guest") {
                    // Logged in but not registered -> Let component show empty/error state or redirect
                    // For now, allow them to see the page but it might be empty.
                    // Ideally, redirect to an "unauthorized" page or show alert.
                }
            }
        }
    }, [user, role, loading, router, pathname]);

    const childIdSuffix = childId ? `?childId=${childId}` : "";
    const navItems = [
        { href: `/parent/home${childIdSuffix}`, label: "ホーム", icon: Home },
        { href: `/parent/payment${childIdSuffix}`, label: "利用料", icon: Wallet },
        { href: `/parent/documents${childIdSuffix}`, label: "お便り", icon: FileText },
    ];

    // Don't show layout elements on login page
    if (pathname === "/parent/login") {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <span className="animate-pulse text-blue-500 text-sm">Loading...</span>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 pb-16 md:pb-0">
            {/* Header */}
            <header className="bg-white border-b p-4 sticky top-0 z-10 flex justify-between items-center bg-opacity-90 backdrop-blur-sm">
                <h1 className="text-lg font-bold text-primary">きらきら児童クラブ</h1>
                {/* Only show Admin Link for Admins */}
                {role === "admin" && (
                    <Link href="/admin/dashboard" className="text-[10px] text-gray-400 hover:text-gray-600 border px-2 py-1 rounded hover:bg-gray-50">
                        管理者画面へ
                    </Link>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4">
                {children}
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 md:hidden z-20">
                {navItems.map((item) => {
                    const basePath = item.href.split("?")[0];
                    return (
                        <Link
                            key={basePath}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors",
                                pathname.startsWith(basePath)
                                    ? "text-primary bg-primary/5"
                                    : "text-muted-foreground hover:bg-gray-100"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop Navigation (Simple Header Links for now, focus on Mobile) */}
            <div className="hidden md:block fixed top-4 right-4 space-x-4">
                {/* Placeholder for Desktop Nav if needed */}
            </div>
        </div>
    );
}

export default function ParentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <span className="animate-pulse text-blue-500 text-sm">Loading...</span>
            </div>
        }>
            <ParentLayoutInner>{children}</ParentLayoutInner>
        </Suspense>
    );
}
