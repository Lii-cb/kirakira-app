"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function GuardianLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError("");

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            if (!user.email) {
                setError("Googleメールアドレスが取得できませんでした。");
                await auth.signOut();
                return;
            }

            // Check if any child has this email authorized
            const q = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError("このアカウントに関連付けられた児童が見つかりません。管理者に連絡してください。");
                await auth.signOut(); // Force sign out if not authorized
                return;
            }

            // Success
            router.push("/guardian/home");

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError("ログインがキャンセルされました。");
            } else {
                setError("ログインに失敗しました: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-sm shadow-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full text-primary">
                            <LogIn className="w-6 h-6" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center font-bold">保護者ログイン</CardTitle>
                    <CardDescription className="text-center">
                        Googleアカウントでログインしてください
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && <p className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded">{error}</p>}

                    <Button
                        type="button"
                        className="w-full py-6 flex items-center gap-2"
                        variant="outline"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                        )}
                        Googleでログイン
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
