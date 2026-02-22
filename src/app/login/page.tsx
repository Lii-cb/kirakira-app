"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
    const router = useRouter();
    const { login, user, role, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (loading) return;

        if (user && role) {
            if (role === 'admin' || role === 'staff') {
                router.push("/admin/dashboard");
            } else if (role === 'parent') {
                router.push("/parent/home");
            } else if (role === 'guest') {
                setError("このアカウントは登録されていません。管理者に連絡してください。");
                setIsLoggingIn(false);
            }
        }
    }, [user, role, loading, router]);

    const handleLogin = async () => {
        try {
            setError(null);
            setIsLoggingIn(true);
            await login();
            // Redirect handled by useEffect
        } catch (err: unknown) {
            console.error(err);
            setError("ログインに失敗しました。");
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">きらきら学童クラブ</CardTitle>
                    <CardDescription>統合ログイン (保護者・職員・管理者)</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button
                        className="w-full gap-2 py-6 text-lg"
                        size="lg"
                        onClick={handleLogin}
                        disabled={isLoggingIn || (loading && !!user)}
                    >
                        {isLoggingIn || (loading && !!user) ? <span className="mr-2">...</span> : <Chrome className="h-5 w-5" />}
                        Googleでログイン
                    </Button>
                    {error && (
                        <div className="text-sm text-red-500 text-center font-bold bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}
                    <div className="text-xs text-center text-muted-foreground mt-4">
                        <p>保護者の方・職員の方・管理者の方すべて共通です。</p>
                        <p>アカウントの権限に応じて自動的に画面が切り替わります。</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
