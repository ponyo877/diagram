# Diagramer — Cloudflare Workers Backend

Cloudflare Workers + D1 + Durable Objects で構成されたバックエンド。

## アーキテクチャ

```
Cloudflare Pages ← フロントエンド (Vite build)
         ↓ /api/*, /yjs/*
Cloudflare Worker (Hono) ← REST API + WebSocket ルーティング
         ↓                         ↓
   D1 Database              Durable Objects
 (メタデータ + Yjs状態)    (WebSocket + リアルタイム同期)
         ↓
   Cron Triggers (90日クリーンアップ)
```

## ローカル開発

```bash
cd workers

# 依存インストール
npm install

# D1 マイグレーション（ローカル）
npm run d1:migrate:local

# 開発サーバー起動 (port 8787)
npm run dev
```

フロントエンドを Workers に接続する場合:
```bash
cd frontend
API_TARGET=http://localhost:8787 npm run dev
```

## Cloudflare へデプロイ

### 1. D1 データベース作成

```bash
npm run d1:create
# 出力された database_id を wrangler.toml に設定
```

`wrangler.toml` の `database_id` を実際の値に置換:
```toml
[[d1_databases]]
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. D1 マイグレーション（リモート）

```bash
npm run d1:migrate:remote
```

### 3. Worker デプロイ

```bash
npm run deploy
```

### 4. フロントエンド デプロイ (Cloudflare Pages)

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name diagramer
```

### 5. ルーティング設定

同一ドメインで Pages と Worker を動かす場合、Cloudflare Dashboard で:
- Pages のカスタムドメインを設定
- Worker の Routes で `/api/*` と `/yjs/*` を Worker にルーティング

## 構成ファイル

| ファイル | 内容 |
|---------|------|
| `src/index.ts` | Worker エントリー (Hono + Cron) |
| `src/durable-objects/DiagramRoom.ts` | DO: Yjs WebSocket 同期 |
| `src/lib/yjs-protocol.ts` | バイナリプロトコル (lib0 varint) |
| `src/types.ts` | Env 型定義 |
| `migrations/0001_init.sql` | D1 スキーマ |
| `wrangler.toml` | Cloudflare 設定 |
