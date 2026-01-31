"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
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
        <div className="flex h-[80vh] flex-col items-center justify-center text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">エラーが発生しました</h2>
            <p className="mb-8 text-gray-600">
                処理中にエラーが発生しました。<br />
                時間をおいて再度お試しください。
            </p>
            <Button onClick={() => reset()} variant="outline">
                もう一度試す
            </Button>
        </div>
    );
}
