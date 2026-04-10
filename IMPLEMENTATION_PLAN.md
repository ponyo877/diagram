# Diagramer 実装計画

## 全体 Phase 構成

| Phase | タイトル | 成果物 |
|-------|---------|--------|
| 1 | プロジェクト基盤 | ランディング→ダイアグラムページ遷移が動く |
| 2 | キャンバス＆ノードシステム | 5種ノードを配置・移動・リサイズできる |
| 3 | ノードプロパティ編集 | 右サイドバーで属性・メソッド等を編集できる |
| 4 | エッジシステム | 6種エッジを描画・編集できる |
| 5 | リアルタイム同期＆永続化 | 複数ユーザーがYjsで同期し、PostgreSQLに保存される |
| 6 | PlantUML出力＆最終仕上げ | エクスポート・キーボードショートカット・本番構成 |

---

## Phase 1: プロジェクト基盤 ✅ TODO

### 目標
「クラス図を作成」を押すと新しい UUID のダイアグラムページに遷移する、最小限の動作確認ができる状態。

### 作業内容

#### ディレクトリ構成
```
diagramer/
├── frontend/    ← Vite + React + TS + Tailwind CSS + React Router
├── backend/     ← Node.js + Fastify + TypeScript
├── nginx/       ← nginx.conf（開発時はバイパス、本番で使用）
└── docker-compose.yml
```

#### frontend
- Vite + React + TypeScript
- 依存: `react-router-dom`, `tailwindcss`
- `Landing.tsx`: ロゴ + 「クラス図を作成」ボタン → `POST /api/diagrams` → `/diagram/:id` にリダイレクト
- `DiagramPage.tsx`: プレースホルダー（「キャンバス準備中」表示）
- `App.tsx` でルーティング設定

#### backend
- Node.js + Fastify + TypeScript + `pg`
- `POST /api/diagrams` → UUID v4 生成 → DBインサート → `{ id }` 返却
- `GET /api/diagrams/:id` → 存在確認 → 200 or 404

#### Docker Compose（開発用）
```yaml
services:
  postgres:  image: postgres:16-alpine
  backend:   ポート3001、ts-node-dev でホットリロード
  frontend:  ポート5173、Vite dev server
```

#### DB マイグレーション
```sql
CREATE TABLE diagrams (
  id               UUID        PRIMARY KEY,
  yjs_state        BYTEA,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_diagrams_last_accessed ON diagrams (last_accessed_at);
```

### 動作確認
1. `docker-compose up` で3コンテナ起動
2. `http://localhost:5173` でランディングページが表示される
3. 「クラス図を作成」を押すと `/diagram/<uuid>` に遷移する
4. 同じURLに再アクセスしても404にならない

---

## Phase 2: キャンバス＆ノードシステム

### 目標
5種ノードをパレットから選んでキャンバスに配置・ドラッグ移動・リサイズできる。

### 追加依存（frontend）
```
@xyflow/react    ← React Flow v12
nanoid           ← ID生成
```

### 作業内容

#### 型定義（`src/types/diagram.ts`）
- `NodeType`, `EdgeType`, `Multiplicity`, `Visibility`
- `Attribute`, `Method`, `Parameter`, `EnumValue`
- `ClassNodeData`, `EnumNodeData`, `NoteNodeData`, `PackageNodeData`
- `DiagramEdgeData`

#### React Flow キャンバス（`src/components/Canvas/Canvas.tsx`）
- `<ReactFlow>` + `<Background variant="dots">` + `<MiniMap>` + `<Controls>`
- `nodeTypes` に5種カスタムノードを登録
- パレット選択中にキャンバスをクリック → ノード作成

#### カスタムノード
- **ClassNode.tsx**: ステレオタイプ・名前・属性・メソッドを区画表示。`<NodeResizer>`付き
- **EnumNode.tsx**: `<<enumeration>>` + 名前 + 列挙値リスト
- **NoteNode.tsx**: 付箋風スタイル（薄黄色）
- **PackageNode.tsx**: コンテナ型。上部タブにパッケージ名

#### パレット（`src/components/Palette/Palette.tsx`）
- 画面下部固定
- 5ボタン: [クラス][インターフェース][列挙型][ノート][パッケージ]
- 選択中ハイライト。Escape で選択解除

#### ノード作成（`src/utils/nodeFactory.ts`）
- 種別ごとのデフォルトデータを返すファクトリ
- 初期サイズ: Class=200×150, Enum=160×120, Note=160×80, Package=300×200

### 動作確認
1. パレット「クラス」を選択 → キャンバスクリック → ノード出現
2. ノードをドラッグで移動できる
3. ノード角をドラッグでリサイズできる
4. 5種全ノードが正しいスタイルで表示される

---

## Phase 3: ノードプロパティ編集

### 目標
ノードをクリックすると右サイドバーが開き、全プロパティを編集できる。

### 作業内容

#### インライン名前編集
- ダブルクリック → `<input>` に切り替え → Enter/フォーカスアウトで確定

#### 右サイドバー（`src/components/Sidebar/`）
- **Sidebar.tsx**: 選択ノード/エッジに応じてサブコンポーネントを切り替え
- **NodeProperties.tsx**: クラス名・ステレオタイプ・背景色・属性リスト・メソッドリスト・削除ボタン
  - visibility: `+/-/#/~` のドロップダウン
  - interface の場合 stereotype は読み取り専用
- **EnumProperties.tsx**: 名前・背景色・列挙値リスト
- **NoteProperties.tsx**: テキストエリア・背景色
- **PackageProperties.tsx**: 名前・背景色

### 動作確認
1. クラスノードをクリック → 右サイドバーが開く
2. 属性を追加・削除・visibility変更できる
3. メソッドを追加・削除できる（引数も）
4. 色を変更するとノードの背景色が変わる
5. Enum/Note/Package も同様に編集できる

---

## Phase 4: エッジシステム

### 目標
6種エッジを正しい視覚スタイルで描画でき、ホバーハンドルからドラッグで接続、サイドバーで種別・多重度を編集できる。

### 作業内容

#### カスタムエッジ（`src/components/Canvas/edges/DiagramEdge.tsx`）
`getSmoothStepPath` で直角折れ線。`data.edgeType` で分岐してSVGマーカーを切り替え:

| 種別 | 線 | ターゲット側 | ソース側 |
|------|------|------------|--------|
| association | 実線 | なし | なし |
| generalization | 実線 | 白抜き三角 | なし |
| realization | 破線 | 白抜き三角 | なし |
| dependency | 破線 | 開き矢印 | なし |
| aggregation | 実線 | なし | 白抜きひし形 |
| composition | 実線 | なし | 塗りつぶしひし形 |

多重度ラベルはエッジ両端付近に `<text>` で描画。

#### ホバーハンドル
- ノード四辺に `<Handle>` を配置。通常は透明、ホバー時に表示

#### EdgeProperties.tsx
- 種別選択（6種）・多重度選択（未設定/1/0..n/1..n/0..1）・削除ボタン

### 動作確認
1. ノードにホバー → 四辺にハンドルが出現
2. ハンドルからドラッグ → 別ノードにドロップ → 実線で接続
3. エッジ選択 → 種別変更 → スタイルが即座に変わる
4. 全6種のエッジスタイルが正しく描画される
5. 多重度ラベルが表示される

---

## Phase 5: リアルタイム同期＆永続化

### 目標
複数ブラウザで同じURLを開くと変更がリアルタイム同期され、リロードしても状態が復元される。

### 追加依存
```
frontend: yjs, y-websocket (client)
backend:  yjs, y-websocket (server), ws, node-cron
```

### 作業内容

#### Yjs ドキュメント構造
```typescript
yNodes     = ydoc.getMap('nodes')    // nodeId → NodeData
yNodeLayout = ydoc.getMap('layout') // nodeId → {x,y,w,h,parentId?}
yEdges     = ydoc.getMap('edges')   // edgeId → EdgeData
```

#### React Flow ↔ Yjs バインディング（`useYjsDiagram.ts`）
- `onNodesChange` / `onEdgesChange` → Yjs に書き込み（`doc.transact`）
- `yNodes.observe` / `yEdges.observe` → React Flow state に反映
- `isRemoteUpdate` フラグで循環防止

#### カスタムy-websocket サーバー（`yjsHandler.ts`）
- 接続時: DBから `yjs_state` ロード → `Y.applyUpdate` で復元
- 接続数チェック: 10人超で `ws.close(4429)`
- 更新受信: ブロードキャスト + デバウンス1秒でDB保存
- 切断時: 接続数を減算、`last_accessed_at` 更新

#### Awareness（プレゼンス）
- カーソル位置・ユーザー名・カラーを共有
- 10色パレットから入室順に自動割り当て
- リモートカーソルをSVG矢印＋ユーザー名ラベルで表示

#### Undo/Redo
- `Y.UndoManager` で per-user スコープ
- `doc.transact(fn, ydoc.clientID)` で origin を明示

#### 90日クリーンアップ
- `node-cron` で毎日0時に `last_accessed_at < NOW() - INTERVAL '90 days'` を削除

### 動作確認
1. ブラウザAでノード追加 → ブラウザBで即座に見える
2. リロード → 状態が復元される
3. カーソルが他ユーザーに表示される
4. ユーザー名変更が反映される
5. 11人目が接続エラーになる
6. ツールバーに「保存済み ✓」が表示される

---

## Phase 6: PlantUML出力＆最終仕上げ

### 目標
PlantUMLエクスポートが動作し、キーボードショートカットが揃い、本番デプロイ構成が整う。

### 作業内容

#### PlantUML変換（`src/utils/plantUmlExporter.ts`）
- 全ノード・エッジを PlantUML テキストに変換
- 多重度変換: `0..n→0..*`, `1..n→1..*`
- パッケージ内ノードはネスト構造で出力

#### エクスポートモーダル（`ExportModal.tsx`）
- ツールバーボタンでモーダル表示
- テキスト表示 + 「コピー」+ 「ダウンロード（.puml）」

#### キーボードショートカット（`useKeyboardShortcuts.ts`）
| ショートカット | 処理 |
|------------|------|
| `Delete` / `Backspace` | 選択中のノード/エッジを削除 |
| `Escape` | 選択解除・パレット解除・モーダル閉じる |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` / `Ctrl+V` | ノードのコピー＆ペースト（+20px offset） |

#### URLコピーボタン（Toolbar）
- `navigator.clipboard.writeText(window.location.href)`
- クリック後2秒間「コピーしました！」に変更

#### 本番構成
- `docker-compose.prod.yml`: Nginx + backend + postgres
- `nginx/nginx.conf`: SPA配信・API・WebSocketプロキシ

### 動作確認
1. PlantUML出力モーダルが動作する（コピー・ダウンロード）
2. 全パターンが正しいPlantUML構文で出力される
3. Delete キー・Ctrl+Z/C/V が動作する
4. URLコピーボタンが動作する
5. 本番Docker構成が起動する

---

## 主要ファイル一覧

```
frontend/src/
  types/diagram.ts
  pages/Landing.tsx
  pages/DiagramPage.tsx
  components/Canvas/Canvas.tsx
  components/Canvas/nodes/ClassNode.tsx
  components/Canvas/nodes/EnumNode.tsx
  components/Canvas/nodes/NoteNode.tsx
  components/Canvas/nodes/PackageNode.tsx
  components/Canvas/edges/DiagramEdge.tsx
  components/Toolbar/Toolbar.tsx
  components/Palette/Palette.tsx
  components/Sidebar/Sidebar.tsx
  components/Sidebar/NodeProperties.tsx
  components/Sidebar/EdgeProperties.tsx
  components/Cursors/RemoteCursors.tsx
  components/ExportModal/ExportModal.tsx
  hooks/useYjsProvider.ts
  hooks/useYjsDiagram.ts
  hooks/useCollaboration.ts
  hooks/useAutoSave.ts
  hooks/useUndoManager.ts
  hooks/useKeyboardShortcuts.ts
  utils/nodeFactory.ts
  utils/plantUmlExporter.ts
  utils/colorPalette.ts

backend/src/
  index.ts
  routes/diagrams.ts
  db/index.ts
  db/migrations/001_init.sql
  websocket/yjsHandler.ts
  cron/cleanup.ts

docker-compose.yml
docker-compose.prod.yml
nginx/nginx.conf
```
