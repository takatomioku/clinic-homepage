# クリニックチャットボットサーバー

おく内科消化器クリニックのFAQチャットボット用サーバーサイドアプリケーション

## 機能

- OpenAI GPT-4を使用したチャットボット
- 日次使用量制限（デフォルト100回/日）
- レート制限（10回/分）
- MySQL データベースによる使用量管理
- Google Cloud Run での実行最適化

## セットアップ

### 1. 環境変数設定

`.env`ファイルを作成し、以下の環境変数を設定：

```bash
cp .env.example .env
```

### 2. データベースセットアップ

Google Cloud SQL でMySQLインスタンスを作成し、`database.sql`を実行：

```bash
mysql -h [YOUR_DB_HOST] -u [YOUR_DB_USER] -p < database.sql
```

### 3. ローカル開発

```bash
npm install
npm run dev
```

### 4. Google Cloud Run デプロイ

#### Cloud SQLインスタンスの作成
```bash
gcloud sql instances create clinic-chatbot-db \
    --tier=db-f1-micro \
    --region=asia-northeast1 \
    --database-version=MYSQL_8_0
```

#### データベースとユーザーの作成
```bash
gcloud sql databases create clinic_chatbot --instance=clinic-chatbot-db
gcloud sql users create chatbot_user --instance=clinic-chatbot-db --password=[SECURE_PASSWORD]
```

#### Cloud Buildでのデプロイ
```bash
gcloud builds submit --config cloudbuild.yaml
```

#### 手動デプロイ
```bash
# イメージをビルド
docker build -t gcr.io/[PROJECT_ID]/clinic-chatbot .

# Container Registryにプッシュ
docker push gcr.io/[PROJECT_ID]/clinic-chatbot

# Cloud Runにデプロイ
gcloud run deploy clinic-chatbot \
  --image gcr.io/[PROJECT_ID]/clinic-chatbot \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=[PROJECT_ID]:asia-northeast1:clinic-chatbot-db \
  --set-env-vars OPENAI_API_KEY=[YOUR_API_KEY] \
  --set-env-vars DB_HOST=[CLOUD_SQL_IP] \
  --set-env-vars DB_USER=chatbot_user \
  --set-env-vars DB_PASSWORD=[DB_PASSWORD] \
  --set-env-vars DB_NAME=clinic_chatbot \
  --set-env-vars MAX_DAILY_REQUESTS=100 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

## API エンドポイント

### POST /api/chat
チャットメッセージを送信

**Request:**
```json
{
  "message": "診療時間を教えてください"
}
```

**Response:**
```json
{
  "success": true,
  "response": "診療時間は月火木金が午前9:00-12:00、午後2:30-6:30です...",
  "usage": {
    "today": 15,
    "limit": 100
  }
}
```

### GET /api/usage
現在の使用量を確認

**Response:**
```json
{
  "success": true,
  "usage": {
    "today": 15,
    "limit": 100,
    "remaining": 85
  }
}
```

### GET /health
ヘルスチェック

## エラーコード

- `RATE_LIMIT_EXCEEDED`: 日次制限に達した
- `TOO_MANY_REQUESTS`: レート制限に達した
- `SERVICE_UNAVAILABLE`: OpenAI APIクオータ不足
- `SERVER_BUSY`: OpenAI APIレート制限
- `INTERNAL_ERROR`: サーバー内部エラー

## セキュリティ

- Helmet.js によるセキュリティヘッダー
- CORS設定による接続元制限
- レート制限による悪用防止
- 入力バリデーション
- 非rootユーザーでの実行

## モニタリング

Google Cloud Loggingでログを確認：

```bash
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=clinic-chatbot"
```

## 費用見積もり

- Cloud Run: ~$5-20/月 (使用量による)
- Cloud SQL: ~$10-25/月 (db-f1-micro)
- OpenAI API: $0.03/1K tokens (GPT-4)

月100回 × 30日 = 3000回の想定で月$20-50程度

## トラブルシューティング

### データベース接続エラー
1. Cloud SQL インスタンスが起動しているか確認
2. 環境変数が正しく設定されているか確認
3. Cloud SQLの認証設定を確認

### OpenAI API エラー
1. APIキーが正しく設定されているか確認
2. OpenAIアカウントの請求設定を確認
3. API使用量制限を確認

### デプロイエラー
1. Docker イメージのビルドが成功しているか確認
2. Cloud Runの権限設定を確認
3. 環境変数がすべて設定されているか確認