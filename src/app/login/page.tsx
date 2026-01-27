"use client";

import { auth } from "@/lib/firebase/client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UserProfile } from "@/types/firestore";

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        try {
            setError(null);
            const provider = new GoogleAuthProvider();
            // Force account selection to allow easy switching
            provider.setCustomParameters({
                prompt: "select_account"
            });

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists in Firestore
            const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase/client");

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // Create new user with default role 'guardian'
                const newUser: UserProfile = {
                    uid: user.uid,
                    email: user.email,
                    fullName: user.displayName,
                    role: "guardian",
                    createdAt: serverTimestamp() as any, // Timestamp handling can be tricky, casting for now
                };
                await setDoc(userRef, newUser);
            }

            // Successful login
            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            setError("ログインに失敗しました。管理者にお問い合わせください。");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">放課後児童クラブ</CardTitle>
                    <CardDescription>保護者・職員用ログイン (Firebase)</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button
                        className="w-full gap-2"
                        size="lg"
                        onClick={handleLogin}
                    >
                        <Chrome className="h-5 w-5" />
                        Googleでログイン
                    </Button>
                    {error && (
                        <div className="text-sm text-red-500 text-center font-bold">
                            {error}
                        </div>
                    )}
                    <div className="text-xs text-center text-muted-foreground">
                        ※管理事務所から許可されたアカウントのみ利用可能です。
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
