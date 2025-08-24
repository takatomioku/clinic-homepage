const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// OpenAI設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// データベース設定
let pool = null;
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Database pool created successfully');
  } catch (error) {
    console.error('Database pool creation failed:', error);
    pool = null;
  }
} else {
  console.log('Database configuration not found, running without database');
}

// ミドルウェア設定
app.use(helmet());
app.use(cors({
  origin: ['https://takatomioku.github.io', 'http://localhost:3000', null],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// レート制限設定
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 10, // 1分間に最大10リクエスト
  message: {
    success: false,
    error: 'リクエストが多すぎます。しばらく待ってからお試しください。',
    code: 'TOO_MANY_REQUESTS'
  }
});

app.use('/api/', limiter);

// クリニック情報システムプロンプト
const clinicSystemPrompt = `あなたは「おく内科消化器クリニック」の受付スタッフとして、患者様からの質問に答えるアシスタントです。

【クリニック基本情報】
・名称：医療法人社団 陸仁会 おく内科消化器クリニック
・住所：〒080-0015 北海道帯広市西5条南21丁目2-2 イオン帯広店南向い
・電話：0155-66-6170
・FAX：050-3730-6562

【診療時間】
・月火木金：午前9:00-12:00、午後2:30-6:30
・水土：午前9:00-12:00のみ
・日曜・祝日・第1,3,5土曜は休診
・受付時間：8:30〜18:00（昼休みも受付可能）

【診療科目】
・内科（高血圧、脂質異常症、糖尿病などの生活習慣病、風邪などの一般内科）
・消化器内科（胃腸、肝臓などの腹部疾患）
・内視鏡内科（胃カメラ、大腸カメラ）

【検査・設備】
・胃カメラ（経鼻・経口、鎮静剤使用可能）
・大腸カメラ
・ピロリ菌検査
・各種超音波検査
・デジタルレントゲン
・心電図
・無料WiFi完備

【予約について】
・一般診察：予約不要（直接来院）
・胃カメラ・大腸カメラ：要予約
・健康診断（個人）：ネット予約可能
・特定健診・がん検診：予約不要

【年齢制限】
・一般診察：高校生以上
・インフルエンザワクチン：中学3年生以上
・その他ワクチン：高校生以上

【支払い】
・各種クレジットカード
・楽天ペイ、WAON、nanaco、Edy
・交通系電子マネー対応

【駐車場】
・クリニック前、向かい側、少し離れた場所にも駐車場完備

あなたは以下の特徴を持ってください：
1. 丁寧で親切な口調
2. 医療の専門的な内容は分かりやすく説明
3. 不明な点は「お電話でお問い合わせください」と案内
4. 緊急時は「すぐに受診してください」と適切に案内
5. 上記の情報を基に正確に回答`;

// 簡易使用量チェック関数（データベース不要）
async function checkDailyUsage() {
  const maxDailyRequests = parseInt(process.env.MAX_DAILY_REQUESTS) || 1000;
  
  // データベースなしの場合は制限なしで許可
  console.log('Running without database usage tracking');
  return { currentUsage: 0, maxDailyRequests, canProceed: true };
}

// 簡易使用量更新関数（データベース不要）
async function updateDailyUsage() {
  // データベースなしの場合はログのみ
  console.log('Chat request processed at:', new Date().toISOString());
  return;
}

// チャットAPI エンドポイント
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // バリデーション
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'メッセージが必要です'
      });
    }
    
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'メッセージが長すぎます'
      });
    }
    
    // 簡易使用量チェック（高速化）
    const usageCheck = await checkDailyUsage();
    
    // OpenAI API呼び出し（高速化のためGPT-4o-miniを使用）
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: clinicSystemPrompt
        },
        {
          role: 'user',
          content: message.trim()
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const response = completion.choices[0].message.content;
    
    // 使用量更新（簡易ログ）
    await updateDailyUsage();
    
    // レスポンス（シンプル化）
    res.json({
      success: true,
      response: response
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({
        success: false,
        error: 'サービスが一時的に利用できません。お電話でお問い合わせください。',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        success: false,
        error: 'サーバーが混雑しています。しばらく待ってからお試しください。',
        code: 'SERVER_BUSY'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました。お電話でお問い合わせください。',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ヘルスチェック
app.get('/health', async (req, res) => {
  try {
    const dbStatus = pool ? 'connected' : 'not_configured';
    
    if (pool) {
      // データベースがある場合は接続テスト
      await pool.execute('SELECT 1');
    }
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'healthy_with_warnings',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
      message: 'Service running without database'
    });
  }
});

// 使用量確認エンドポイント（オプション）
app.get('/api/usage', async (req, res) => {
  try {
    const usageCheck = await checkDailyUsage();
    res.json({
      success: true,
      usage: {
        today: usageCheck.currentUsage,
        limit: usageCheck.maxDailyRequests,
        remaining: Math.max(0, usageCheck.maxDailyRequests - usageCheck.currentUsage)
      }
    });
  } catch (error) {
    console.error('Usage check error:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません'
  });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'サーバーエラーが発生しました'
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`Database configured: ${!!pool}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});