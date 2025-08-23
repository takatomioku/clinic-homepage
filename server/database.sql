-- クリニックチャットボット用データベースセットアップ

-- データベース作成
CREATE DATABASE IF NOT EXISTS clinic_chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE clinic_chatbot;

-- 日次使用量管理テーブル
CREATE TABLE IF NOT EXISTS daily_usage (
    date DATE PRIMARY KEY,
    total_requests INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- セッション管理テーブル（オプション - より詳細な分析が必要な場合）
CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    request_count INT DEFAULT 0,
    
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address)
);

-- チャットログテーブル（オプション - サービス改善のためのログ）
CREATE TABLE IF NOT EXISTS chat_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255),
    message_type ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    tokens_used INT,
    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    INDEX idx_message_type (message_type)
);

-- 使用量統計ビュー
CREATE VIEW usage_stats AS
SELECT 
    date,
    total_requests,
    DAYNAME(date) as day_of_week,
    WEEK(date) as week_number,
    MONTH(date) as month_number,
    YEAR(date) as year_number
FROM daily_usage
ORDER BY date DESC;

-- サンプルデータ挿入（テスト用）
INSERT INTO daily_usage (date, total_requests) 
VALUES 
    (CURDATE(), 0),
    (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 45),
    (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 67)
ON DUPLICATE KEY UPDATE total_requests = total_requests;

-- 権限設定用のユーザー作成（本番環境用）
-- CREATE USER 'chatbot_user'@'%' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE ON clinic_chatbot.daily_usage TO 'chatbot_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON clinic_chatbot.chat_sessions TO 'chatbot_user'@'%';
-- GRANT SELECT, INSERT ON clinic_chatbot.chat_logs TO 'chatbot_user'@'%';
-- FLUSH PRIVILEGES;