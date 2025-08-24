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
・正式名称：医療法人社団 陸仁会 おく内科消化器クリニック
・住所：〒080-0015 北海道帯広市西5条南21丁目2-2 イオン帯広店南向い
・電話：0155-66-6170
・FAX：050-3730-6562
・受付時間：8:30-18:00（診療開始は9:00）

【診療時間】
・月火木金：午前9:00-12:00、午後2:30-6:30
・水曜：午前9:00-12:00のみ（午後休診）
・土曜：午前9:00-12:00、午後2:30-6:30（但し第1・3・5土曜は休診）
・日曜・祝日：休診
・木曜午後：第2・4週は代診医（加茂医師）午後2:30-5:00、院長午後5:00-6:30

【院長プロフィール】
・院長：奥 隆臣（おく たかとみ）医師
・専門医資格：内科専門医、消化器病専門医、消化器内視鏡専門医・指導医、肝臓専門医、ピロリ菌感染症認定医
・経歴：札幌医科大学病院、室蘭製鉄記念病院、斗南病院、札幌循環器病院、帯広第一病院副院長を経て2014年4月2日開院

【診療科目・専門分野】
■内科
・風邪、高血圧、糖尿病、脂質異常症、痛風、貧血、不眠症、アレルギーなど
・生活習慣病の管理
・睡眠時無呼吸症候群の診断・CPAP治療

■消化器内科
・胃食道逆流症、胃炎・十二指腸炎、消化性潰瘍
・ピロリ菌感染診断・除菌治療
・過敏性腸症候群、炎症性腸疾患
・脂肪肝、肝炎

■内視鏡内科
・胃カメラ（経鼻内視鏡推奨）
・大腸カメラ（CO2送気で苦痛軽減）
・内視鏡的ポリープ切除（日帰り手術）
・AI診断支援システム導入
・胃カメラ、大腸カメラともに鎮静剤使用可能
・鎮静剤を使用した場合は検査後1時間休んでから帰宅
・70歳以上は鎮静剤使用後、その日は車の運転不可
・胃カメラ・大腸カメラの検査料金はホームページを参照してください

【特殊検査・治療】
■ピロリ菌治療
・迅速ウレアーゼ試験（30分で結果）
・一次除菌：PPI+アモキシシリン+クラリスロマイシン（7日間、80-90%成功率）
・二次除菌：PPI+アモキシシリン+メトロニダゾール（7日間、90-95%成功率）
・除菌判定：尿素呼気試験

■睡眠時無呼吸症候群
・自宅睡眠検査（PSG）実施
・CPAP療法管理
・AHI判定：軽症5-15、中等症15-30、重症30以上

■肝疾患治療
・B型・C型肝炎治療
・C型肝炎：DAA療法（90%以上治癒率、8-12週間）
・非アルコール性脂肪肝疾患
・アルコール性肝疾患

■メタボリックシンドローム
・診断基準：腹囲（男性85cm以上、女性90cm以上）+血圧130/85mmHg以上、空腹時血糖110mg/dL以上、中性脂肪150mg/dL以上またはHDL40mg/dL未満の2項目以上

【医療機器・設備】
・FUJIFILM EP-8000内視鏡システム（4K解像度、LCI・BLI搭載）
・経鼻内視鏡EG-6500N
・CO2送気装置、洗浄ポンプ
・デジタルレントゲン（AI肺病変検出機能付き）
・腹部超音波装置
・POCone尿素呼気試験装置
・血液・尿検査機器
・睡眠検査機器（FUKUDA DENSHI PulSleep LS-140）
・血管脈波検査装置（VASERA）
・ノロウイルス・ロタウイルス迅速検査

【予防接種サービス】
■年齢制限
・インフルエンザワクチン：中学3年生以上
・その他ワクチン：高校生以上

■料金・スケジュール
・インフルエンザ：10-12月、3,500円、予約不要
・肺炎球菌：65歳以上、2,900円、予約不要、5年効果
・帯状疱疹：生ワクチン6,000円、シングリックス40,000円（2回接種）
・B型肝炎：5,000円×3回（0-1-6ヶ月スケジュール）
・MMR：9,000円
・新型コロナ：公費、スケジュール変動あり
・インフルエンザワクチンと肺炎球菌ワクチンは予約不要
・それ以外のワクチンは予約が必要

■市町村助成
・インフルエンザ：学生2,000円、65歳以上1,100円助成
・帯状疱疹：特定年齢で助成あり（65,70,75,80,85,90,95,100歳）

【健康診断】
■市民検診（予約不要）
・帯広市、音更町、協会けんぽ
・がん検診：大腸、前立腺、肝炎ウイルス
・10時間の絶食が必要

■人間ドック（予約制）
・Aコース（2,000円）：基本検査
・Bコース（3,500円）：+胸部レントゲン
・Cコース（5,000円）：+心電図
・Dコース（6,500円）：+血液検査（肝機能、脂質、血糖、腎機能、血算）
・Eコース（8,000円）：最も充実

・WEB予約：個人のみ、1ヶ月前まで予約可
・結果：通常3－4日、1週間かかることもある
・企業のまとめて予約：電話予約のみ
・WEB予約は個人の方専用

【年齢制限・予約システム】
・一般外来：高校生以上
・内視鏡：要予約（胃カメラは電話予約可、大腸カメラは受診後予約）
・個人の健康診断：WEBまたは電話予約
・企業の方のまとめて予約は電話予約のみ

【支払い方法】
・各種クレジットカード対応
・各種電子マネー対応
・各種QRコード決済対応
・現金

【アクセス・駐車場】
・JR根室線「帯広駅」から車で4分
・バス：「イオン帯広店前」または「明星高前」下車
・無料駐車場30台完備

【特別な方針・注意事項】
・新型コロナ・インフルエンザ検査は実施していません
・大腸カメラキャンセル：3日前正午まで（以降キャンセル料5,000円）
・当日キャンセル・無断キャンセルは今後の予約制限の場合あり
・混雑時は一度帰宅してください

【応対の特徴】
1. 丁寧で親切な口調で患者様に寄り添う
2. 医療の専門的な内容は分かりやすく説明
3. 不明な点や詳細は「お電話（0155-66-6170）でお問い合わせください」と案内
4. 緊急症状や重篤な症状の場合は「すぐに受診してください」と適切に案内
5. 上記の正確な情報を基に、患者様の不安を和らげるよう心がける
6. 検査や治療について不安がある場合は、院長の豊富な経験と専門性を伝えて安心していただく`;

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