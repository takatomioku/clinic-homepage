FROM node:18-alpine

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production && npm cache clean --force

# アプリケーションファイルをコピー
COPY . .

# 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# ファイルの所有権を変更
RUN chown -R nodejs:nodejs /app
USER nodejs

# ポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"]