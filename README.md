# タスク管理アプリケーション

Next.js (App Router) + Supabase + Tailwind CSSで構築した、フル機能のタスク管理アプリケーションです。

## 🎯 機能

### ✅ 実装済み機能

1. **認証機能**
   - メールアドレス・パスワードでのログイン/サインアップ
   - Supabase Authによる認証管理
   - セッション管理

2. **タスク管理**
   - タスクの作成、編集、削除
   - タスク一覧表示
   - タスクの詳細情報（タイトル、説明、ステータス、優先度、期限日）
   - タスク詳細情報に音声入力も搭載

3. **検索・フィルタリング**
   - タイトル・説明に対するLIKE検索
   - ステータスでのフィルタリング（未対応/対応中/完了）
   - 優先度でのフィルタリング（低/中/高）
   - リアルタイム検索

4. **リアルタイム更新**
   - Supabase Realtimeによる自動同期
   - タスクの作成・編集・削除が即座に画面に反映
   - 複数デバイス間での同期

5. **Slack通知**
   - タスク作成時に自動通知
   - リッチフォーマット対応（ステータス、優先度、説明など）
   - Next.js API Routesを使用した安全な通知送信

6. **統計ダッシュボード**
   - タスク総数の表示
   - ステータス別タスク数の表示
   - 視覚的に分かりやすいカードUI

7. **Google Calendarへの予定追加**
   - ワンタップで予定追加のリンクに飛べる
   - リンク発効後は自由に予定を編集

## 🚀 セットアップ手順

### 1. 前提条件

- Node.js 18以上
- Supabaseアカウント
- Slack Incoming Webhook URL（通知機能を使用する場合）

### 2. Supabaseプロジェクトの設定

#### 2.1 Supabaseプロジェクトを作成

1. [Supabase](https://supabase.com/)にアクセスしてプロジェクトを作成
2. プロジェクトのURLとAnon Keyを取得

#### 2.2 データベーステーブルの作成

SupabaseのSQL Editorで以下のSQLを実行してください：

```sql
-- tasksテーブルの作成
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Row Level Security (RLS)の有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- ユーザーは自分のタスクのみ閲覧可能
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のタスクのみ作成可能
CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のタスクのみ更新可能
CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のタスクのみ削除可能
CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);
```

#### 2.3 Realtimeの有効化

1. Supabase DashboardのDatabase → Replication に移動
2. `tasks`テーブルのRealtimeを有効化

### 3. Slack Webhook URLの取得

1. [Slack API](https://api.slack.com/apps)にアクセス
2. "Create New App" → "From scratch"を選択
3. アプリ名とワークスペースを選択
4. "Incoming Webhooks"を有効化
5. "Add New Webhook to Workspace"をクリック
6. 通知を送信するチャンネルを選択
7. Webhook URLをコピー

### 4. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集して以下の値を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 5. 依存関係のインストール

```bash
npm install
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。


## 🛠️ 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase
  - 認証: Supabase Auth
  - データベース: PostgreSQL
  - リアルタイム: Supabase Realtime
- **通知**: Slack Incoming Webhooks
- **アイコン**: Lucide React
- **音声入力**: Web Speech API

## 🎨 主な機能の使い方

### タスクの作成

1. ダッシュボードの「新規タスク」ボタンをクリック
2. タイトル、説明、ステータス、優先度、期限日を入力
3. 「作成」ボタンをクリック
4. Slackに通知が送信されます

### タスクの検索

1. 検索バーにキーワードを入力（タイトル・説明を検索）
2. 「フィルター」ボタンでステータスや優先度を絞り込み
3. リアルタイムで検索結果が表示されます

### リアルタイム同期

- 他のデバイスやタブでタスクを作成・編集・削除すると、自動的に画面に反映されます
- ブラウザをリロードする必要はありません

## 📝 カスタマイズ

### タスクのステータスを追加

1. `types/task.ts`の`TaskStatus`型を編集
2. Supabaseのテーブル定義を更新（CHECKコンストレイント）
3. `components/TaskCard.tsx`と`components/TaskForm.tsx`のステータス表示を更新

### Slack通知のカスタマイズ

`app/api/slack/notify/route.ts`を編集して通知フォーマットを変更できます。

## 🐛 トラブルシューティング

### リアルタイム更新が動作しない

- Supabase DashboardでRealtimeが有効化されているか確認
- ブラウザの開発者ツールでWebSocket接続を確認

### Slack通知が送信されない

- `.env.local`の`SLACK_WEBHOOK_URL`が正しく設定されているか確認
- Slack Appが正しく設定されているか確認
- サーバーログでエラーメッセージを確認

### 認証エラー

- Supabaseの認証設定を確認
- `.env.local`の設定が正しいか確認
- ブラウザのCookieが有効になっているか確認

---

Created by NaiYuk (最終更新：2025/12/05)
