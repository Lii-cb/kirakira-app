# KiraKira Manager デプロイメントガイド

このアプリをインターネット上で公開（デプロイ）し、ソースコードを保存（GitHub）するための手順です。

## 1. GitHub (ソースコード管理)

ソースコードをクラウド（GitHub）に保存します。

### 手順
1.  **GitHubでリポジトリを作成**:
    *   [GitHub](https://github.com/new) にアクセスし、新しいリポジトリを作成します（例: `kirakira-app`）。
    *   "Public"（公開）か "Private"（非公開）かを選択します。
    *   "Initialize this repository with..." のチェックボックスは **全て外して** ください（空のリポジトリを作成）。

2.  **リモートURLの設定**:
    *   作成後、表示されるURL（例: `https://github.com/yourname/kirakira-app.git`）をコピーします。
    *   ターミナルで以下のコマンドを実行します（URLは書き換えてください）。

    ```bash
    git remote add origin https://github.com/yourname/kirakira-app.git
    git branch -M main
    git push -u origin main
    ```

## 2. Firebase (アプリ公開 & データベース)

アプリを動かすサーバーとデータベースの準備です。

### 手順 A: Firebaseコンソールでの設定
1.  **プロジェクト作成**:
    *   [Firebase Console](https://console.firebase.google.com/) にアクセスし、「プロジェクトを追加」をクリック。
    *   プロジェクト名（例: `kirakira-app`）を入力して作成。

2.  **Firestore Databaseの有効化**:
    *   左メニュー「Build」→「Firestore Database」を選択。
    *   「データベースの作成」をクリック。
    *   ロケーションは `asia-northeast1` (Tokyo) を推奨。
    *   セキュリティルールは「本番環境モードで開始」を選択（後で自動デプロイされます）。

3.  **Authentication (認証) の有効化** (実装済みの場合):
    *   左メニュー「Build」→「Authentication」を選択。
    *   「始める」をクリックし、必要なプロバイダ（メール/パスワードなど）を有効にします。

### 手順 B: お手元の端末での操作 (デプロイ)
以下のコマンドをターミナルで順番に実行します。

1.  **Firebase CLIのインストール** (未インストールの場合):
    ```bash
    npm install -g firebase-tools
    ```

2.  **ログイン**:
    ```bash
    firebase login
    ```
    （ブラウザが開き、Googleアカウントでログインを求められます）

3.  **プロジェクトの紐付け**:
    ```bash
    firebase use --add
    ```
    *   リストから先ほど作成したプロジェクトを選択します。
    *   エイリアス名を聞かれたら `default` と入力します。

4.  **デプロイ (公開)**:
    ```bash
    firebase deploy
    ```
    *   成功すると `Hosting URL: https://kirakira-app.web.app` のようなURLが表示されます。これが公開用URLです。

## 3. 環境変数の設定 (重要)
現在のコードはローカル開発用の設定が含まれている場合があります。本番環境で動かす場合、Firebase Hostingの設定で環境変数を指定する必要がある場合がありますが、まずは上記手順で基本的な公開が可能です。
