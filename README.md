# Kirakira App Ver 7.1

学童保育管理システム

## 概要

保護者、スタッフ、管理者向けの包括的な学童保育管理プラットフォーム。

## 主な機能

### 保護者向け
- 保護者ポータル（ログイン、ホーム画面）
- 出席確認・予約管理
- スタッフとのメッセージング
- ドキュメント閲覧
- 支払い管理

### スタッフ・管理者向け
- 出席管理ダッシュボード
- 児童情報管理
- 予約・スケジュール管理
- レポート生成
- CSV インポート/エクスポート

## 技術スタック

- **フロントエンド:** Next.js 15, React, TypeScript
- **スタイリング:** Tailwind CSS
- **バックエンド:** Firebase (Firestore, Authentication, Hosting)
- **データ同期:** Google Apps Script (Spreadsheet連携)
- **UI コンポーネント:** shadcn/ui, Lucide Icons

## セットアップ

### 前提条件
- Node.js 18+
- Firebase プロジェクト
- Google Spreadsheet（データ同期用）

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集して Firebase 設定を追加
```

### 開発サーバー

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## デプロイ

### Firebase Hosting

```bash
# ビルド（オプション）
npm run build

# デプロイ
firebase deploy --only hosting
```

### Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

## プロジェクト構造

```
src/
├── app/              # Next.js App Router ページ
│   ├── admin/        # 管理画面
│   ├── parent/       # 保護者ポータル
│   ├── dashboard/    # ダッシュボード
│   └── login/        # ログイン
├── components/       # React コンポーネント
│   ├── admin/        # 管理用コンポーネント
│   └── ui/           # 共通 UI コンポーネント
├── contexts/         # React Context
├── lib/              # ユーティリティ
│   └── firebase/     # Firebase 設定
└── types/            # TypeScript 型定義
```

## バージョン履歴

### Ver 7.1 (2026-02-10)
- **Guardian → Parent リネーム完了**
  - 用語の統一（Guardian → Parent）
  - `parents` コレクション作成
  - Security Rules 更新
  - GAS スクリプト Ver 7.1 デプロイ

### Ver 6.3 (2026-01)
- GAS 統合、データ同期機能
- 管理画面改善

### Ver 6.1
- 基本機能実装

## ライセンス

Private

## サポート

問題が発生した場合は、プロジェクト管理者に連絡してください。
