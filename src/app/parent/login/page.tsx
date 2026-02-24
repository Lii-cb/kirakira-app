"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ParentLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError("");

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            // バージョン表示 | フッターに `Ver 2.2.1` 表示
            const user = result.user;

            if (!user.email) {
                setError("Googleメールアドレスが取得できませんでした。");
                await auth.signOut();
                return;
            }

            // Check 1: Admin only (NOT staff) - admins can access parent portal
            const staffId = user.email.replace(/[.#$[\]]/g, "_");
            const VERSION = "Ver 2.2.2";
            const staffQuery = query(collection(db, "staff_users"), where("email", "==", user.email));
            const staffSnapshot = await getDocs(staffQuery);

            if (!staffSnapshot.empty) {
                const staffData = staffSnapshot.docs[0].data();
                if (staffData.isActive && staffData.role === "admin") {
                    // Admin should go to admin dashboard by default
                    router.push("/admin/dashboard");
                    return;
                }
                // Staff (role !== "admin") cannot access parent portal
            }

            // Check 2: Parents collection
            const parentQuery = query(collection(db, "parents"), where("email", "==", user.email));
            const parentSnapshot = await getDocs(parentQuery);

            if (!parentSnapshot.empty) {
                // Valid parent
                router.push("/parent/home");
                return;
            }

            // Check 3: Fallback - authorizedEmails in children (backward compatibility)
            const childQuery = query(collection(db, "children"), where("authorizedEmails", "array-contains", user.email));
            const childSnapshot = await getDocs(childQuery);

            if (!childSnapshot.empty) {
                // Valid parent (legacy)
                router.push("/parent/home");
                return;
            }

            // Not authorized
            setError("このアカウントに関連付けられた児童が見つかりません。管理者に連絡してください。");
            await auth.signOut();

        } catch (err: unknown) {
            console.error("Login Error Details:", err);
            const firebaseError = err as { code?: string; message?: string };
            console.error("Error Code:", firebaseError.code);
            console.error("Error Message:", firebaseError.message);

            if (firebaseError.code === 'auth/popup-closed-by-user') {
                setError("ログイン画面が閉じられました。");
            } else if (firebaseError.code === 'auth/cancelled-popup-request') {
                setError("ログイン処理が重複しています。もう一度お試しください。");
            } else if (firebaseError.code === 'auth/popup-blocked') {
                setError("ポップアップがブロックされました。設定を確認してください。");
            } else {
                setError(`ログインに失敗しました: ${firebaseError.message || "不明なエラー"}`);
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
                        Googleアカウントでログインしてください<br />
                        <span className="text-[10px] text-slate-400">Ver 2.2.2</span>
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
