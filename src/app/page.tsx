import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
      <div className="max-w-3xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
            放課後児童クラブ<br className="md:hidden" />管理アプリ
          </h1>
          <p className="text-xl text-slate-600">
            保護者と運営をつなぐ、シンプルで使いやすいポータル
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">

          {/* Guardian Portal */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-100">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">保護者の方はこちら</CardTitle>
              <CardDescription>
                入室管理、お迎え時間の変更、<br />各種申請などが行えます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/guardian/login">
                <Button className="w-full group" size="lg">
                  保護者ポータルへ
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Portal */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-100">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">運営スタッフはこちら</CardTitle>
              <CardDescription>
                児童名簿の管理、出席確認、<br />請求管理などが行えます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/dashboard">
                <Button className="w-full bg-slate-800 hover:bg-slate-700 group" size="lg">
                  管理画面へ
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-sm text-slate-400">
          v1.1.0 (Firestore Sync Enabled)
        </div>
      </div>
    </div>
  );
}
