# Release Notes

## Ver 7.1 (2026-02-10)

### 主な変更

#### 用語の統一
- **Guardian → Parent への完全リネーム**
  - すべてのコード、UI、ドキュメントで用語を統一
  - より直感的で理解しやすい命名に変更

#### データベース変更
- **新規コレクション**
  - `parents` コレクション作成（旧 `guardians`）
  - Email ベース認証に統一

- **フィールド名変更**
  - `children.guardianIds` → `children.parentIds`
  - `children.guardianName` → `children.parentName`
  - `authorizedEmails` 廃止（`parentIds` に統合）

#### ルーティング変更
- `/guardian/*` → `/parent/*`
  - `/parent/login` - 保護者ログイン
  - `/parent/home` - 保護者ホーム
  - `/parent/reserve` - 予約管理
  - `/parent/payment` - 支払い管理
  - `/parent/documents` - ドキュメント

#### Security Rules 更新
- `parents` コレクションのアクセス制御追加
- `staff_users` ベースの認証に変更
- 後方互換性確保（`authorizedEmails` サポート継続）

#### GAS スクリプト
- Ver 7.1 デプロイ
- `Master_Guardians` → `Master_Parents` シート名変更
- `GuardianIDs` → `ParentIDs` 列名変更

### 破壊的変更

⚠️ 以下の変更により、既存のコードやデータに影響があります：

1. **ルート変更**
   - 旧: `/guardian/*`
   - 新: `/parent/*`
   - ブックマークや直リンクの更新が必要

2. **コレクション名**
   - 旧: `guardians`
   - 新: `parents`
   - データマイグレーション実施済み

3. **フィールド名**
   - 旧: `guardianIds`, `guardianName`
   - 新: `parentIds`, `parentName`
   - データマイグレーション実施済み

### マイグレーション

データマイグレーションは自動実行済みです。

- `guardians` → `parents` コレクション作成
- `children` レコードのフィールド名更新
- `attendance` メッセージの送信者フィールド更新

### 既知の問題

1. **Turbopack ビルドエラー**
   - `npm run build` が失敗する場合があります
   - 回避策: `firebase deploy --only hosting` を使用
   - 開発サーバー（`npm run dev`）は正常動作

### アップグレード手順

Ver 6.3 から Ver 7.1 へのアップグレード：

1. コードを最新版に更新
2. `firebase deploy --only firestore:rules` で Security Rules デプロイ
3. `firebase deploy --only hosting` でフロントエンドデプロイ
4. スプレッドシートのシート名・列名を手動更新
5. GAS スクリプト Ver 7.1 をデプロイ

---

## Ver 6.3 (2026-01)

### 主な変更
- GAS 統合、データ同期機能
- 管理画面の改善
- CSV インポート/エクスポート機能

---

## Ver 6.1

### 主な変更
- 基本機能の実装
- 認証システム
- 出席管理
- 予約システム
