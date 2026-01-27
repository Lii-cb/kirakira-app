"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitApplication } from "@/lib/firestore";

export default function EntranceFormPage() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        childLastName: "",
        childFirstName: "",
        childLastNameKana: "",
        childFirstNameKana: "",
        grade: "",
        guardianLastName: "",
        guardianFirstName: "",
        phone: "",
        email: ""
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await submitApplication(formData);
            setIsSubmitted(true);
        } catch (error) {
            console.error(error);
            alert("送信に失敗しました。時間をおいて再度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center py-10">
                    <CardContent className="flex flex-col items-center gap-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                        <h2 className="text-2xl font-bold text-gray-800">送信完了</h2>
                        <p className="text-gray-600">
                            入会申込書を受け付けました。<br />
                            管理者による確認後、ご連絡いたします。
                        </p>
                        <Button className="mt-4" onClick={() => setIsSubmitted(false)}>フォームに戻る</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <Card className="max-w-xl mx-auto">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-2xl text-center text-primary">入会申込書</CardTitle>
                    <CardDescription className="text-center">
                        以下のフォームに必要事項を入力してください。
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 pt-6">
                        {/* Child Information */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-l-4 border-primary pl-2">児童情報</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="childLastName">姓</Label>
                                    <Input
                                        id="childLastName"
                                        placeholder="山田"
                                        required
                                        value={formData.childLastName}
                                        onChange={(e) => handleChange("childLastName", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="childFirstName">名</Label>
                                    <Input
                                        id="childFirstName"
                                        placeholder="太郎"
                                        required
                                        value={formData.childFirstName}
                                        onChange={(e) => handleChange("childFirstName", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="childLastNameKana">せい</Label>
                                    <Input
                                        id="childLastNameKana"
                                        placeholder="やまだ"
                                        required
                                        value={formData.childLastNameKana}
                                        onChange={(e) => handleChange("childLastNameKana", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="childFirstNameKana">めい</Label>
                                    <Input
                                        id="childFirstNameKana"
                                        placeholder="たろう"
                                        required
                                        value={formData.childFirstNameKana}
                                        onChange={(e) => handleChange("childFirstNameKana", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="grade">学年</Label>
                                <Select onValueChange={(val) => handleChange("grade", val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">小学1年生</SelectItem>
                                        <SelectItem value="2">小学2年生</SelectItem>
                                        <SelectItem value="3">小学3年生</SelectItem>
                                        <SelectItem value="4">小学4年生</SelectItem>
                                        <SelectItem value="5">小学5年生</SelectItem>
                                        <SelectItem value="6">小学6年生</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Guardian Information */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-l-4 border-primary pl-2">保護者情報</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="guardianLastName">姓</Label>
                                    <Input
                                        id="guardianLastName"
                                        placeholder="山田"
                                        required
                                        value={formData.guardianLastName}
                                        onChange={(e) => handleChange("guardianLastName", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guardianFirstName">名</Label>
                                    <Input
                                        id="guardianFirstName"
                                        placeholder="花子"
                                        required
                                        value={formData.guardianFirstName}
                                        onChange={(e) => handleChange("guardianFirstName", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">電話番号</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="090-1234-5678"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 bg-gray-50 border-t pt-6">
                        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 送信中...</> : "内容を確認して送信"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            ※ 送信された情報は、プライバシーポリシーに基づき厳重に管理されます。
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
