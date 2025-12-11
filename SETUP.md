# セットアップガイド

このガイドでは、タスク管理アプリを最初から立ち上げるための詳細な手順を説明します。

## 📋 チェックリスト

セットアップを開始する前に、以下を準備してください：

- [ ] Node.js 18以上がインストールされている
- [ ] Supabaseアカウントを作成済み
- [ ] Slackワークスペースの管理者権限（通知機能を使用する場合）

## 🚀 ステップバイステップガイド

### ステップ1: プロジェクトのセットアップ

#### 1.1 依存関係のインストール

```bash
cd task-management-app
npm install
```

### ステップ2: Supabaseの設定

#### 2.1 新しいプロジェクトを作成

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワード、リージョンを入力
4. 「Create new project」をクリック（数分かかります）

#### 2.2 データベースのセットアップ

1. Supabase Dashboard左メニューから「SQL Editor」を選択
2. 「New query」をクリック
3. 以下のSQLコードを貼り付けて実行：

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

-- インデックスの作成（パフォーマンス向上）
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

4. 「Run」をクリックして実行（成功メッセージを確認）

#### 2.3 Realtimeの有効化

1. 左メニューから「Database」→「Replication」を選択
2. `tasks`テーブルを探して、「Enable」ボタンをクリック
3. 確認ダイアログで「Enable replication」をクリック

#### 2.4 認証設定の確認

1. 左メニューから「Authentication」→「Providers」を選択
2. 「Email」プロバイダーが有効になっていることを確認
3. （オプション）「Settings」で「Enable email confirmations」を無効にすると、開発時にメール確認をスキップできます

#### 2.5 API認証情報の取得

1. 左メニューから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` で始まる長い文字列

### ステップ3: Slack Webhookの設定

#### 3.1 Slack Appの作成

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「Create New App」をクリック
3. 「From scratch」を選択
4. App Name（例: タスク管理通知）とワークスペースを選択
5. 「Create App」をクリック

#### 3.2 Incoming Webhooksの有効化

1. 左メニューから「Incoming Webhooks」を選択
2. 「Activate Incoming Webhooks」をOnに切り替え
3. 下の「Add New Webhook to Workspace」をクリック
4. 通知を送信したいチャンネルを選択
5. 「許可する」をクリック
6. Webhook URL（`https://hooks.slack.com/services/...`）をコピー

### ステップ4: 環境変数の設定

#### 4.1 .env.localファイルの作成

```bash
cp .env.local.example .env.local
```

#### 4.2 環境変数の編集

`.env.local`ファイルを開いて、以下の値を設定：

```env
# Supabaseの設定（ステップ2.5で取得した値）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Slack Webhook URL（ステップ3.2で取得した値）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### ステップ5: アプリケーションの起動

#### 5.1 開発サーバーの起動

```bash
npm run dev
```

#### 5.2 アプリケーションの確認

1. ブラウザで [http://localhost:3000](http://localhost:3000) を開く
2. ログインページが表示されることを確認

### ステップ6: 動作確認

#### 6.1 ユーザー登録

1. 「アカウントをお持ちでない方はこちら」をクリック
2. メールアドレスとパスワード（6文字以上）を入力
3. 「アカウント作成」をクリック

**注意**: メール確認が有効な場合、確認メールのリンクをクリックする必要があります。

#### 6.2 ログイン

1. メールアドレスとパスワードを入力
2. 「ログイン」をクリック
3. ダッシュボードにリダイレクトされることを確認

#### 6.3 タスクの作成

1. 「新規タスク」ボタンをクリック
2. 以下を入力：
   - タイトル: テストタスク
   - 説明: これはテストです
   - ステータス: 未対応
   - 優先度: 高
   - 期限日: 今日の日付
3. 「作成」をクリック
4. タスクが一覧に表示されることを確認
5. Slackの指定チャンネルに通知が届くことを確認

#### 6.4 リアルタイム機能の確認

1. ブラウザで2つのタブを開く
2. 両方のタブで同じアカウントでログイン
3. 一方のタブでタスクを作成・編集・削除
4. もう一方のタブで自動的に更新されることを確認

#### 6.5 検索機能の確認

1. 複数のタスクを作成
2. 検索バーにキーワードを入力
3. リアルタイムで結果が絞り込まれることを確認
4. フィルターボタンでステータス・優先度を絞り込み

## 🎉 セットアップ完了！

すべての機能が正常に動作していることを確認できました。

## 🐛 トラブルシューティング

### よくある問題

#### 問題1: npm installでエラーが発生する

**解決策**:
```bash
# Node.jsのバージョンを確認
node -v  # 18以上である必要があります

# キャッシュをクリア
npm cache clean --force

# 再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 問題2: Supabaseに接続できない

**解決策**:
- `.env.local`の`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_ANON_KEY`が正しいか確認
- 環境変数は`NEXT_PUBLIC_`プレフィックスが必要です
- 開発サーバーを再起動（環境変数の変更後は必須）

#### 問題3: RLSエラーが発生する

**エラーメッセージ**: "new row violates row-level security policy"

**解決策**:
- SupabaseのSQL Editorで全てのRLSポリシーが作成されているか確認
- `auth.uid()`が正しく機能しているか確認
- 一時的にRLSを無効化してテスト（本番環境では非推奨）

#### 問題4: Realtimeが動作しない

**解決策**:
- Supabase Dashboard → Database → Replicationで`tasks`テーブルが有効になっているか確認
- ブラウザの開発者ツール（F12）→ NetworkタブでWebSocket接続を確認
- Supabaseの無料プランでは同時接続数に制限があります

#### 問題5: Slack通知が届かない

**解決策**:
- `.env.local`の`SLACK_WEBHOOK_URL`が正しいか確認
- Webhook URLが有効か、Slackのアプリ設定で確認
- ブラウザの開発者ツールでAPI呼び出しのエラーを確認
- サーバーのコンソールログを確認

#### 問題6: 認証メールが届かない

**解決策**:
- 迷惑メールフォルダを確認
- Supabase Dashboard → Authentication → Settingsでメール設定を確認
- 開発時は「Enable email confirmations」を無効化すると便利
- カスタムSMTPを設定している場合は、認証情報を確認

## 📚 次のステップ

セットアップが完了したら、以下をお試しください：

1. **カスタマイズ**: 色、レイアウト、機能を自由にカスタマイズ
2. **デプロイ**: Vercelにデプロイして本番環境で使用
3. **機能追加**: タグ機能、ファイル添付、コメント機能など

## 💡 ヒント

- **開発時**: メール確認を無効化すると便利
- **本番環境**: 必ずRLSを有効化してセキュリティを確保
- **パフォーマンス**: 大量のタスクがある場合はページネーションを実装
- **監視**: Supabase Dashboardでデータベースのパフォーマンスを監視

---

困ったことがあれば、README.mdのトラブルシューティングセクションも参照してください。
