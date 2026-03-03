"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">予期せぬエラーが発生しました</h2>
                <p className="mb-8 text-gray-600">
                    申し訳ありませんが、システムエラーが発生しました。<br />
                    再読み込みをお試しください。
                </p>
                <Button onClick={() => reset()} variant="default">
                    再読み込み
                </Button>
            </body>
        </html>
    );
}
