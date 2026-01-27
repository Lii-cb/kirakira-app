"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// MOCK: In real app, this comes from Supabase users table
const MOCK_ROLES = ["admin", "staff", "guardian"] as const;
type Role = typeof MOCK_ROLES[number];

import { UserProfile } from "@/types/firestore";

export default function DashboardRouter() {
    const router = useRouter();
    const [status, setStatus] = useState("loading"); // loading, redirecting, no-user

    useEffect(() => {
        const checkRole = async () => {
            const { onAuthStateChanged } = await import("firebase/auth");
            const { doc, getDoc } = await import("firebase/firestore");
            const { auth, db } = await import("@/lib/firebase/client");

            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    router.push("/login");
                    return;
                }

                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as UserProfile;
                        const role = userData.role;

                        setStatus("redirecting");
                        if (role === "admin" || role === "staff") {
                            router.push("/admin/dashboard");
                        } else {
                            router.push("/guardian/home");
                        }
                    } else {
                        // Fallback
                        router.push("/guardian/home");
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            });

            return () => unsubscribe();
        };

        checkRole();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>読み込み中...</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-muted-foreground">ユーザー情報を確認しています。</p>
                </CardContent>
            </Card>
        </div>
    );
}
