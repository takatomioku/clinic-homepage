# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

MR面談Web予約システム — 製薬会社 MR（Medical Representative）がおく内科消化器クリニックに面談予約を入れる純粋な HTML/CSS/JS アプリ。ビルドプロセスなし。

**Production URL**: `https://takatomioku.github.io/clinic-homepage/appointment-system/`  
**Deployment**: `main` ブランチへの push で GitHub Pages が自動デプロイ（1〜3分）

## Local Development

```bash
# リポジトリルート (clinic-homepage/) から起動
python -m http.server 8000
# または
npx serve .
# → http://localhost:8000/appointment-system/ でアクセス
```

## File Structure

| ファイル | 役割 |
|---|---|
| `index.html` | UI全体・Firebase SDK初期化・EmailJS SDK読み込み |
| `appointment-firestore.js` | `AppointmentSystem` クラス（全ビジネスロジック） |
| `styles.css` | スタイル（管理者パネル・モーダル・カレンダー含む） |
| `emailjs-monitor.gs` | Google Apps Script — 毎朝9時にEmailJS疎通チェックし異常時にメール通知 |

`appointment.js`（旧ローカル専用版）と `setup-guide.md` は削除済み。参照しないこと。

## Architecture

### AppointmentSystem クラス (`appointment-firestore.js`)

クラス単体でアプリ全体を管理。`DOMContentLoaded` で `new AppointmentSystem()` してグローバル変数 `appointmentSystem` に格納。

**初期化フロー**
```
constructor
  └─ waitForFirestore()   // window.firebaseDB を最大5秒ポーリング
       └─ initializeSystem()
            ├─ loadBookingsFromFirestore()
            ├─ initializeCalendar() / generateCalendar()
            ├─ bindEvents()
            ├─ updateAvailableDates()
            └─ initializeAdminMode()
```

**ストレージ戦略**
- Firestore が primary。失敗時は `this.useFirestore = false` にフォールバックし localStorage を使用。
- 予約保存・削除は常に localStorage にも同期（`appointments` キー）。
- Firebase SDK は `index.html` の `<script type="module">` で初期化し `window.firebaseDB` に格納。`appointment-firestore.js` 側は `import()` で動的に Firestore 関数を呼ぶ。

### 予約ルール（定数）

```javascript
maxBookingsPerDay = 2          // 通常枠
maxBookingsIncludingReserve = 3 // 通常+予備
availableDays = [1, 2, 4, 5]   // 月・火・木・金
```

### Firestore データ構造

コレクション: `appointments`  
各ドキュメントのフィールド:

```
name, company, phone, email, date (YYYY-MM-DD), slot (1|2|3), createdAt (ISO), isReserve (bool)
```

メモリ上のキャッシュ構造:
```javascript
this.bookings = {
  "2026-04-21": {
    1: { name, company, phone, email, createdAt, isReserve, firestoreId },
    2: { ... }
  }
}
```

### 管理者機能

管理者モードはパスワード認証で有効化（パスワードは `this.adminPassword` に格納。`appointment-firestore.js` 冒頭の constructor を参照）。

有効化後に表示されるボタン:
- **予約一覧表示/非表示** — 日付・スロット順に一覧表示
- **本日の予約** — 一覧を開き今日の date-group へスムーズスクロール。予約なしは4秒メッセージ表示
- **期間指定削除** — 開始日〜終了日を指定し対象一覧を確認モーダルで表示してから一括削除
- **ダミー予約作成** — 指定日のスロット1・2を name="ダミー" で埋め、外部予約不可にする
- **EmailJS接続テスト** — テストメールを `takatomioku1152@gmail.com` に送信

### カレンダーセルの状態

| クラス | 意味 |
|---|---|
| `available` | 空き（緑） |
| `full` | 通常枠満席（赤） |
| `reserve-used` | 予備枠使用中（黄） |
| `dummy-blocked` | ダミーで封鎖（グレー） |
| `unavailable` / `past-date` / `other-month` | 選択不可 |

## 外部サービス

| サービス | 設定値 |
|---|---|
| Firebase Project | `appointment-system-e689c` |
| EmailJS Service | `service_l3gxbkp` |
| EmailJS Template | `template_r2rilz7` |
| EmailJS Public Key | `hTM2ZpRABZXseBb-p`（`index.html` で init） |
| GAS 監視スクリプト | `emailjs-monitor.gs` を Google Apps Script にデプロイし `setupDailyTrigger()` を手動実行してトリガー設定 |

## よくある問題

- **Firestore に保存されない**: Firebase コンソールで Firestore のセキュリティルールが `allow read, write: if true;` になっているか確認。
- **確認メール未着**: EmailJS ダッシュボードで Gmail 接続を再認証（`Disconnect` → `Connect Gmail`）。管理者画面の「EmailJS接続テスト」で切り分け可能。
- **ダミー予約の削除**: 管理者モードの「予約一覧表示」からキャンセルボタンで削除。
