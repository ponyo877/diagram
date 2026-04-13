# Diagramer 機能一覧

UML クラス図をリアルタイム共同編集できる Web アプリケーション「Diagramer」の全機能を網羅的に記載する。

---

## 目次

1. [ダイアグラム管理](#1-ダイアグラム管理)
2. [ノード機能](#2-ノード機能)
3. [エッジ機能](#3-エッジ機能)
4. [キャンバス操作](#4-キャンバス操作)
5. [プロパティ編集](#5-プロパティ編集)
6. [リアルタイムコラボレーション](#6-リアルタイムコラボレーション)
7. [永続化・自動保存](#7-永続化自動保存)
8. [Undo / Redo](#8-undo--redo)
9. [キーボードショートカット](#9-キーボードショートカット)
10. [PlantUML 連携](#10-plantuml-連携)
11. [自動レイアウト](#11-自動レイアウト)
12. [UI/UX 要素](#12-uiux-要素)
13. [インフラ構成](#13-インフラ構成)

---

## 1. ダイアグラム管理

### 1.1 ダイアグラム新規作成
- **動作**: ランディングページ `/` の「New Diagram」ボタン押下 → `/diagram/:uuid` へ遷移
- **仕組み**: `POST /api/diagrams` で `crypto.randomUUID()` を生成し D1 に INSERT
- **関連**: `Landing.tsx` `handleCreate`, `workers/src/index.ts` POST ルート

### 1.2 ダイアグラム存在確認
- **動作**: 無効/削除済み UUID へアクセス → 「Diagram not found」画面
- **仕組み**: `GET /api/diagrams/:id` で D1 クエリ、404 なら NotFound UI、同時に `last_accessed_at` 更新
- **関連**: `DiagramPage.tsx` status チェック, `workers/src/index.ts` GET ルート

### 1.3 90日自動クリーンアップ
- **動作**: 90日アクセスなしのデータは自動削除
- **仕組み**: Cloudflare Cron Trigger（毎日 UTC 0:00）で `DELETE ... WHERE last_accessed_at < datetime('now', '-90 days')`
- **関連**: `workers/src/index.ts` `scheduled`, `workers/wrangler.toml` `[triggers]`

---

## 2. ノード機能

### 2.1 5種類のノード
| 種別 | デフォルト色 | 特徴 |
|------|------------|------|
| **Class** | `#e3ecf8` 薄青 | 属性・メソッドセクション付き |
| **Interface** | `#e4e1f5` 薄紫 | `<<interface>>` ステレオタイプ固定 |
| **Enum** | `#daf0e2` 薄緑 | `<<enumeration>>` + 値リスト |
| **Note** | `#fdf5dc` 薄黄 | 折れ角装飾、複数行テキスト |
| **Package** | `#f0ebe3` 薄茶 | タブ型ヘッダー、子ノード内包可 |

- **関連**: `types/diagram.ts`, `nodeFactory.ts`, `components/Canvas/nodes/*.tsx`

### 2.2 ノード作成 (複数方法)
- **パレット選択**: 下部フローティングパレットの5アイコンをクリック → キャンバス上クリックで配置
- **キーボードショートカット**: `C` / `I` / `E` / `N` / `P`
- **プレビュー追従**: パレット選択中、カーソル位置に透過プレビューノード（opacity 0.4）を表示
- **仕組み**: `createNode()` でデフォルトデータ生成、`handleCreateNode()` が Yjs トランザクション内で保存
- **関連**: `Palette.tsx`, `Canvas.tsx` `handlePaneClick`/`handleMouseMove`, `utils/nodeFactory.ts`

### 2.3 ノード移動・リサイズ
- **動作**: ドラッグで移動、選択時の角/辺ハンドルでリサイズ
- **仕組み**: React Flow `NodeResizer` コンポーネント、`onNodesChange` で Yjs 反映
- **関連**: 各ノードコンポーネント `NodeResizer`

### 2.4 インライン編集
| ノード | 編集対象 | 操作 |
|-------|---------|------|
| Class/Interface | 名前 | ヘッダーをダブルクリック → `<input>` |
| Enum | 名前 | ヘッダーをダブルクリック → `<input>` |
| Note | 本文 | 本文をダブルクリック → `<textarea>` |
| Package | 名前 | タブをダブルクリック → `<input>` |

- **仕組み**: `isEditing` state 切替、`useReactFlow().setNodes` で data 更新
- **確定**: Enter または blur / **キャンセル**: Escape
- **関連**: 各ノードコンポーネント `startEdit*`/`commitEdit*`

### 2.5 ノード複製 / 切り取り / 貼り付け
- `Cmd+C` / `Ctrl+C`: クリップボード（`useRef`）にコピー
- `Cmd+X` / `Ctrl+X`: コピー + 削除（切り取り）
- `Cmd+V` / `Ctrl+V`: +20,+20 オフセット位置に貼り付け
- **関連**: `DiagramPage.tsx` keyboard handler

### 2.6 ノード削除
- **動作**: Delete / Backspace キー、またはサイドバー「Delete Node」ボタン
- **仕組み**: `handleDeleteNode()` が yNodes から削除、接続エッジも自動削除
- **関連**: `useYjsDiagram.ts` `handleDeleteNode`

### 2.7 接続ハンドル
- **動作**: ノードホバー時に4方向のハンドルが表示、ドラッグで他ノードへエッジ作成
- **仕組み**: Source/Target ハンドルを4方向に設置、DOM順でsource が手前（ドラッグ開始時にsource優先）
- **関連**: 各ノードコンポーネント `HANDLE_POSITIONS`

---

## 3. エッジ機能

### 3.1 6種類のエッジ
| 種別 | 線 | マーカー | PlantUML |
|------|-----|---------|----------|
| **Association** | 実線 | なし | `--` |
| **Generalization** | 実線 | 白三角（target） | `--\|>` |
| **Realization** | 破線 | 白三角（target） | `..\|>` |
| **Dependency** | 破線 | 矢印（target） | `-->` |
| **Aggregation** | 実線 | 白ダイアモンド（source） | `--o` |
| **Composition** | 実線 | 黒ダイアモンド（source） | `--*` |

- **関連**: `DiagramEdge.tsx`, `plantUmlExporter.ts` `edgeArrow()`

### 3.2 エッジ作成
- **動作**: ノードのハンドルから別ノードへドラッグ
- **仕組み**: React Flow `onConnect` → デフォルト `edgeType: 'association'` で yEdges に追加
- **関連**: `useYjsDiagram.ts` `onConnect`

### 3.3 エッジ選択 → インラインツールバー
- **動作**: エッジクリックで中点付近にフローティングツールバー表示
- **構成要素**:
  - 6種のエッジ型アイコンボタン（クリックで即時変更）
  - Source 多重度 select（始点ノード名先頭4文字ラベル）
  - Target 多重度 select（終点ノード名先頭4文字ラベル）
  - 削除ボタン ✕
- **仕組み**: `EdgeActionsContext` で更新/削除関数を注入、`EdgeLabelRenderer` で ViewPort 座標に配置、z-index 1000
- **関連**: `DiagramEdge.tsx`, `contexts/EdgeActionsContext.tsx`

### 3.4 多重度
- **種類**: `—`（未設定）, `1`, `0..1`, `0..*` (内部 `0..n`), `1..*` (内部 `1..n`)
- **表示**: エッジの両端近傍に白背景のラベル（UML 標準表記 `0..*` 形式で表示、z-index 1000）
- **関連**: `types/diagram.ts` `Multiplicity`, `DiagramEdge.tsx` `displayMult`

### 3.5 エッジ削除
- **動作**: Delete キー、ツールバー ✕ ボタン、サイドバー「Delete Edge」
- **関連**: `useYjsDiagram.ts` `handleDeleteEdge`

---

## 4. キャンバス操作

### 4.1 パン / ズーム
- **パン**: マウス右クリックドラッグ または スペース + ドラッグ
- **ズーム**: マウスホイール / ピンチ
- **仕組み**: React Flow 標準機能
- **関連**: `Canvas.tsx` ReactFlow props

### 4.2 背景グリッド
- **動作**: 24px 間隔のドットパターン（色 `#ddd8cf`）
- **関連**: `Canvas.tsx` `<Background variant={Dots} />`

### 4.3 Fit View
- **動作**: インポート後・Auto Layout 後に全ノードが画面内に収まるよう自動ズーム/パン
- **仕組み**: `useReactFlow().fitView({ padding: 0.2, maxZoom: 1, duration: 300 })`
- **関連**: `DiagramPage.tsx` `handleImport`/`handleAutoLayout`

### 4.4 配置プレビューノード
- **動作**: パレット選択中、マウス位置に配置予定ノードが半透明表示
- **仕組み**: `previewPos` state を mousemove で更新、`__preview__` ID のノードを nodes 配列に追加、`draggable/selectable/connectable: false`
- **関連**: `Canvas.tsx` preview node logic

### 4.5 パレット解除
- **動作**: Escape / パレットの選択中ボタンを再クリック
- **関連**: `Palette.tsx`, `DiagramPage.tsx` keyboard handler

---

## 5. プロパティ編集

### 5.1 サイドバー（フローティング）
- **表示条件**: ノードまたはエッジを選択した時のみ
- **位置**: 右上アクションバーの下（`top-14 right-3`）、`z-10`
- **スタイル**: `w-64`, `bg-white/95 backdrop-blur-sm`, `rounded-2xl`, `shadow-lg`, `max-h-[calc(100vh-80px)]`
- **関連**: `Sidebar.tsx`

### 5.2 Class / Interface プロパティ
- **General**: Class/Interface 名、Stereotype（Interface は固定）、背景色（カラーピッカー + hex）
- **Attributes**: visibility (`+/-/#/~`) + name + type + ✕、「+ Add Attribute」
- **Methods**: visibility + name + returnType + ✕、パラメータ子セクション（name + type + ✕、「+ Add Param」）、「+ Add Method」
- **Delete Node** ボタン
- **関連**: `NodeProperties.tsx`

### 5.3 Enum プロパティ
- General（名前 + 色）+ Values（値名 + ✕）+ 「+ Add Value」+ Delete Node
- **関連**: `EnumProperties.tsx`

### 5.4 Note プロパティ
- Content（複数行 `<textarea>`）+ Style（背景色）+ Delete Node
- **関連**: `NoteProperties.tsx`

### 5.5 Package プロパティ
- General（名前 + 色）+ Delete Node
- **関連**: `PackageProperties.tsx`

### 5.6 Edge プロパティ
- Relation（Type select）+ Multiplicity（Source / Target select）+ Delete Edge
- **関連**: `EdgeProperties.tsx`

---

## 6. リアルタイムコラボレーション

### 6.1 Yjs WebSocket 同期
- **動作**: 同じ URL を開いている全ユーザー間で編集がリアルタイム同期
- **仕組み**:
  - `y-websocket` クライアント → `wss://.../yjs/:id` → Cloudflare Worker → Durable Object
  - Yjs CRDT で衝突自動解決
  - バイナリプロトコル（lib0 varint）
- **関連**: `useYjsProvider.ts`, `workers/src/durable-objects/DiagramRoom.ts`, `workers/src/lib/yjs-protocol.ts`

### 6.2 同期ステータス表示
- **状態**: `Saved`（緑 ✓）/ `Saving...`（灰色スピナー）/ `Offline`（赤 ●）
- **仕組み**: `useAutoSave` が `ydoc.on('update')` を監視、1.5秒タイムアウトで状態遷移
- **関連**: `useAutoSave.ts`, `DiagramPage.tsx` `SaveStatusBadge`

### 6.3 ユーザー名設定
- **動作**: 右上の丸型ユーザーボタン（頭文字 + 色）をクリック → インライン入力 → Enter で確定
- **永続化**: `localStorage('diagramer-username')`
- **仕組み**: `awareness.setLocalStateField('name', ...)` で他者に通知
- **関連**: `useCollaboration.ts` `updateUserName`

### 6.4 リモートユーザーバッジ
- **動作**: 現在接続中の他ユーザーがアクションバー左側に色付き pill で表示
- **仕組み**: `awareness.getStates()` から自分以外を抽出、`COLOR_PALETTE` 10色から割当
- **関連**: `RemoteCursors.tsx`, `utils/colorPalette.ts`

### 6.5 リモートカーソル表示
- **動作**: 他ユーザーのマウスカーソルをキャンバス上に矢印 + 名前ラベルで表示、80ms CSSトランジション
- **仕組み**:
  - 自分のカーソル: `updateCursorPosition` が50ms throttle で flow 座標を awareness に送信
  - 表示側: `useViewport()` の transform で flow → screen 座標に変換
- **関連**: `CanvasCursors.tsx`, `useCollaboration.ts` `updateCursorPosition`

### 6.6 キャンバス離脱でカーソル消去
- **動作**: マウスがキャンバス外に出ると自分のカーソル表示が消える
- **仕組み**: `onMouseLeave` → `awareness.setLocalStateField('cursor', null)`
- **関連**: `Canvas.tsx` `handleMouseLeave`

### 6.7 接続数制限
- **動作**: 1ダイアグラムあたり最大10接続まで
- **仕組み**: Durable Object 内で `ctx.getWebSockets().length >= 10` なら `Too Many Connections` 返却
- **関連**: `DiagramRoom.ts` `MAX_CONNECTIONS`

---

## 7. 永続化・自動保存

### 7.1 Yjs 状態の自動保存
- **動作**: 編集のたびに自動で D1 に保存（ユーザー操作不要）
- **仕組み**:
  1. Durable Object が更新を受信
  2. `ctx.storage.setAlarm(Date.now() + 1000)` で1秒デバウンス
  3. `alarm()` 発火時に `Y.encodeStateAsUpdate()` で binary 化 → D1 UPDATE
  4. 全クライアント切断時も最終保存を実行
- **関連**: `DiagramRoom.ts` `scheduleDbSave`/`saveToDB`/`alarm`

### 7.2 Hibernation 対応
- **動作**: アイドル時 DO がメモリから退避 → 次のメッセージ受信時に D1 から Y.Doc 再ロード
- **仕組み**: `ctx.acceptWebSocket()` で Hibernation API 使用、`ensureDoc()` で再構築
- **関連**: `DiagramRoom.ts` `ensureDoc`

### 7.3 D1 スキーマ
```sql
CREATE TABLE diagrams (
  id               TEXT PRIMARY KEY,
  yjs_state        BLOB,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
- **関連**: `workers/migrations/0001_init.sql`

---

## 8. Undo / Redo

- **動作**: `Cmd+Z` / `Cmd+Shift+Z`（Mac）, `Ctrl+Z` / `Ctrl+Shift+Z`（Win）
- **仕組み**:
  - `Y.UndoManager` で `yNodes` / `yEdges` をトラック
  - `trackedOrigins: new Set([ydoc.clientID])` でローカル操作のみ履歴管理
  - インポートは単一トランザクション → 一括アンドゥ可能
- **関連**: `useUndoManager.ts`, `DiagramPage.tsx` keyboard handler

---

## 9. キーボードショートカット

| キー | 動作 | 条件 |
|------|------|------|
| `C` | Class ツール選択 | 入力フォーカス外 |
| `I` | Interface ツール選択 | 入力フォーカス外 |
| `E` | Enum ツール選択 | 入力フォーカス外 |
| `N` | Note ツール選択 | 入力フォーカス外 |
| `P` | Package ツール選択 | 入力フォーカス外 |
| `Escape` | 選択解除、パレット解除、モーダル閉じる、インライン編集キャンセル | — |
| `Delete` / `Backspace` | 選択ノード/エッジ削除 | ノード/エッジ選択中 |
| `Cmd/Ctrl + Z` | Undo | — |
| `Cmd/Ctrl + Shift + Z` | Redo | — |
| `Cmd/Ctrl + C` | ノードコピー | ノード選択中 |
| `Cmd/Ctrl + X` | ノード切り取り（コピー+削除） | ノード選択中 |
| `Cmd/Ctrl + V` | ノード貼り付け | クリップボードあり |
| `Enter` | インライン編集確定 | 編集中 |

- **関連**: `DiagramPage.tsx` `useEffect` keyboard handler

---

## 10. PlantUML 連携

### 10.1 PlantUML Export
- **動作**: 右上「Export」ボタン → モーダルで PlantUML テキスト表示 → 「Copy」「Download .puml」
- **仕組み**: `exportToPlantUml(nodes, edges)` が `@startuml`〜`@enduml` のテキストを生成
  - Class/Interface: `class Name <<stereo>> { +attr : Type }`
  - Enum: `enum Name { VALUE1 ... }`
  - Note: `note "content" as Note_id`
  - Package: ネストブロック
  - Edge: `Src "mult" arrow "mult" Tgt`（多重度は `0..n` → `0..*` 変換）
- **関連**: `utils/plantUmlExporter.ts`, `ExportModal.tsx`

### 10.2 PlantUML Import
- **動作**: 右上「Import」ボタン → テキストエリアに貼り付け → 「Import」ボタン
- **仕組み**:
  - ステートマシン型パーサー（IDLE / IN_CLASS / IN_ENUM）
  - 正規表現で `class`/`interface`/`enum`/`note`/`package`/`edge` 認識
  - 逆向き矢印（`<|--`, `o--`, `*--`, `<|..`）も対応
  - 多重度逆変換: `0..*` → `0..n`
  - 警告収集（最大5件 + 超過分は "...and N more"）
  - 自動レイアウト（dagre）を適用
  - `fitView` で全体表示
- **サンプル挿入**: 「Sample」ボタンでテンプレート自動入力
- **関連**: `utils/plantUmlImporter.ts`, `ImportModal.tsx`

---

## 11. 自動レイアウト

### 11.1 dagre Sugiyama アルゴリズム
- **動作**: 右上「Layout」ボタン → 全ノードを階層型に再配置、fitView で表示
- **仕組み**:
  - `dagre` ライブラリで graph 構築 (rankdir: TB, nodesep: 60, ranksep: 80)
  - Sugiyama アルゴリズムでエッジ交差を最小化
  - 階層（level）を自動検出、各層にノードを配置
  - Package は個別に mini-dagre graph で内部レイアウト
  - インポート時も同じアルゴリズムで初期配置
- **関連**: `utils/diagramLayout.ts`, `DiagramPage.tsx` `handleAutoLayout`, `useYjsDiagram.ts` `handleRelayout`

---

## 12. UI/UX 要素

### 12.1 ランディングページ
- ダークナビバー（高さ 48px）+ 中央ヒーロー（ロゴ + タイトル + 「New Diagram」ピル型CTA + 90日クリーンアップ注記）

### 12.2 エディター画面全体
- フルスクリーン、ヘッダーなし、左上透過ロゴ + 右上アクションバー + 下部パレット + 右サイド条件付きプロパティパネル

### 12.3 左上ロゴ
- 透過（opacity 0.4 → hover 0.7）、クリックで `/` に navigate

### 12.4 右上アクションバー
- 構成: RemoteUsers バッジ + [Saved / Share / Import / Export / Layout / User] の6要素
- 各ボタンにアイコン + 下に小さな英語ラベル（Saved/Share/Import/Export/Layout）
- User は頭文字 + 色の円形ボタン、クリックで名前編集
- スタイル: `bg-white/90 backdrop-blur-sm rounded-xl shadow-md border`

### 12.5 下部フローティングパレット
- 5種ノードアイコン（SVG）+ 英語ラベル（Class / I/F / Enum / Note / Pkg）
- 選択中は `bg-soft-primary-light` でハイライト
- スタイル: `bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg`

### 12.6 フローティングプロパティパネル
- 選択時のみ表示、右サイド、スクロール可、カスタムスクロールバー

### 12.7 フローティングエッジツールバー
- エッジクリック位置の上部16pxに表示、z-index 1000

### 12.8 モーダル（Import / Export）
- 背景 `bg-black/40 backdrop-blur-sm`、中央配置、`rounded-2xl`
- Escape で閉じる、外側クリックで閉じる
- Import: 警告エリア、Sample ボタン、エラー表示

### 12.9 エラー/ローディング画面
- Loading: 「Loading...」
- Not Found: 「Diagram not found」+ Home ボタン
- Error: 「An error occurred」+ Home ボタン

### 12.10 カラーパレット（ユーザー色）
- 10色（red, orange, yellow, green, cyan, blue, violet, pink, teal, amber）を参加順に割当
- **関連**: `utils/colorPalette.ts`

### 12.11 デザインシステム
- フォント: **M PLUS Rounded 1c**（Google Fonts）
- カラートークン: `soft.*` prefix（bg, canvas, primary, green, red, yellow, text, muted, light, border 等）
- 角丸: rounded-full（ボタン）, rounded-xl（ノード）, rounded-2xl（モーダル）
- シャドウ: 暖色系 `rgba(139,120,100,...)` ベース
- 全UI英語

---

## 13. インフラ構成

### 13.1 Cloudflare Pages（フロントエンド）
- Vite ビルド出力を Pages にデプロイ
- カスタムドメイン: `diagramer.ponyo877.com`

### 13.2 Cloudflare Worker（バックエンド）
- `diagramer` ワーカー、Hono フレームワーク
- ルート:
  - `POST /api/diagrams` → 新規作成
  - `GET /api/diagrams/:id` → 存在確認
  - `GET /yjs/:id` → Durable Object に転送
- Worker Routes: `diagramer.ponyo877.com/api/*`, `/yjs/*`

### 13.3 Durable Objects: DiagramRoom
- 1ダイアグラム = 1 DO インスタンス（ID は diagramId）
- WebSocket Hibernation API 対応
- `alarm()` API で DB 保存デバウンス
- lib0 varint プロトコル実装（y-websocket と wire互換）

### 13.4 D1 Database
- SQLite ベース、`diagramer` database
- `diagrams` テーブル (id, yjs_state, created_at, last_accessed_at)
- インデックス: `idx_diagrams_last_accessed`

### 13.5 Cron Trigger
- 毎日 UTC 00:00 に 90日未使用データを削除

### 13.6 開発環境
- Frontend: Vite dev server (port 5173)
- Backend: wrangler dev (port 8787), Miniflare ローカルシミュレーション
- Docker Compose: PostgreSQL + Node.js バックエンドの旧構成も残存（移行前の元実装）

---

## 機能数サマリー

| カテゴリ | 機能数 |
|---------|-------|
| ダイアグラム管理 | 3 |
| ノード機能 | 7 |
| エッジ機能 | 5 |
| キャンバス操作 | 5 |
| プロパティ編集 | 6 |
| リアルタイムコラボレーション | 7 |
| 永続化・自動保存 | 3 |
| Undo/Redo | 1 |
| キーボードショートカット | 13 |
| PlantUML 連携 | 2 |
| 自動レイアウト | 1 |
| UI/UX 要素 | 11 |
| インフラ | 6 |
| **合計** | **70+** |

---

最終更新: 2026-04-13
