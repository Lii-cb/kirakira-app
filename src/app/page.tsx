"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, KeyRound, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
      <div className="max-w-3xl w-full space-y-8 text-center">

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
            きらきら学童クラブ
          </h1>
          <p className="text-xl text-muted-foreground">
            保護者とスタッフをつなぐ、安心・便利な連絡帳アプリ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-12">
          <Card className="hover:shadow-lg transition-shadow border-primary/20 hover:border-blue-300">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-primary">
                保護者の方
              </CardTitle>
              <CardDescription>
                欠席連絡、お迎え時間の変更などはこちら
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/guardian/login">
                <Button className="w-full h-12 text-lg group">
                  保護者ログイン
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-green-200 hover:border-green-300">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                <KeyRound className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-green-700">
                スタッフ・管理者
              </CardTitle>
              <CardDescription>
                出席確認、利用者管理はこちら
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/dashboard">
                <Button variant="outline" className="w-full h-12 text-lg hover:bg-green-50 hover:text-green-700 border-green-200">
                  管理画面へ
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-sm text-gray-400 pt-10">
          Ver 3.1 | © 2025 きらきら学童クラブ
        </div>
      </div>
    </div>
  );
}
