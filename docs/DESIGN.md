# Diagramer — 設計仕様書

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [システムアーキテクチャ](#3-システムアーキテクチャ)
4. [画面構成](#4-画面構成)
5. [UML要素仕様](#5-uml要素仕様)
6. [データモデル](#6-データモデル)
7. [データベーススキーマ](#7-データベーススキーマ)
8. [API設計](#8-api設計)
9. [リアルタイム同期仕様](#9-リアルタイム同期仕様)
10. [PlantUML出力仕様](#10-plantuml出力仕様)
11. [UI/UX仕様](#11-uiux仕様)
12. [非機能要件](#12-非機能要件)
13. [ディレクトリ構成](#13-ディレクトリ構成)
14. [Docker Compose構成](#14-docker-compose構成)

---

## 1. プロジェクト概要

### アプリ名
**Diagramer**（SVGアイコン付き）

### コンセプト
astahのクラス図描画機能をFigmaのように直感的に操作できるWebアプリ。ログイン不要・URLベースの共有で複数ユーザーがリアルタイムに共同編集でき、作成したクラス図をPlantUMLテキストとしてエクスポートできる。

### 主要機能
- クラス図のリアルタイム共同編集（最大10人同時）
- UMLクラス図要素の直感的な作成・編集
- PlantUMLフォーマットでのエクスポート（モーダル表示・コピー・ダウンロード）
- URLベースの共有（ログイン不要）
- 自動保存（最終操作から1秒後）

---

## 2. 技術スタック

| レイヤー | 採用技術 | 選定理由 |
|---------|---------|---------|
| フロントエンド | React 18 + TypeScript | 最大のエコシステム、Yjs・React Flowとの親和性 |
| 描画ライブラリ | React Flow | ノード+エッジ型ダイアグラム特化。パン・ズーム・ドラッグが標準搭載 |
| リアルタイム同期 | Yjs（CRDT）+ y-websocket | 競合自動解決、Awareness APIによるカーソル共有 |
| バックエンド | Node.js + Fastify | y-websocketと同一プロセスで統合可能。TypeScriptで型共有 |
| データベース | PostgreSQL 16 | Yjsバイナリ状態をbytea型で保存。将来拡張に耐える信頼性 |
| デプロイ | Docker Compose（VPS 1台） | WebSocket持続接続のためサーバーレス不可。3コンテナ構成 |
| フロントビルド | Vite | 高速なHMR・ビルド |
| スタイリング | Tailwind CSS | ユーティリティクラスで一貫したUI |

---

## 3. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                        VPS（1台）                         │
│                                                         │
│  ┌──────────┐    ┌──────────────────────────────────┐   │
│  │  Nginx   │    │         Node.js + Fastify        │   │
│  │          │───▶│                                  │   │
│  │ :80/:443 │    │  ┌─────────────┐ ┌────────────┐  │   │
│  │ 静的配信  │    │  │  REST API   │ │ y-websocket│  │   │
│  └──────────┘    │  │ /api/...    │ │ /yjs/:id   │  │   │
│       │          │  └──────┬──────┘ └─────┬──────┘  │   │
│       │          └─────────┼──────────────┼──────────┘  │
│       │                    │              │             │
│       │          ┌─────────▼──────────────▼──────────┐  │
│       │          │           PostgreSQL               │  │
│       │          │  diagrams テーブル（Yjsバイナリ保存）  │  │
│       │          └───────────────────────────────────┘  │
│       │                                                 │
│  ┌────▼──────────────────────────────────────────────┐  │
│  │           React アプリ（静的ファイル）               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

クライアント（ブラウザ）
┌──────────────────────────────────┐
│  React + React Flow + Yjs        │
│                                  │
│  HTTP(REST) ─────────▶ /api/*    │
│  WebSocket  ─────────▶ /yjs/:id  │
└──────────────────────────────────┘
```

### データフロー（リアルタイム同期）

```
ユーザーA操作
    │
    ▼
Yjs Document（ローカル）
    │  Yjs Update（差分バイナリ）
    ▼
y-websocket サーバー
    │
    ├──▶ PostgreSQL（デバウンス1秒後に保存）
    │
    └──▶ ユーザーB・C・...（差分をブロードキャスト）
             │
             ▼
         Yjs Document（ローカル）── React Flow 再レンダリング
```

---

## 4. 画面構成

### 4.1 ランディングページ（`/`）

```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│          [Diagramer SVGロゴ]            │
│                                        │
│            Diagramer                   │
│                                        │
│   UMLクラス図をリアルタイムで共同編集      │
│                                        │
│        ┌──────────────────┐            │
│        │  クラス図を作成   │            │
│        └──────────────────┘            │
│                                        │
│   ※ ログイン不要。URLを共有するだけ。     │
│                                        │
└────────────────────────────────────────┘
```

**動作:**
- 「クラス図を作成」ボタン押下 → `POST /api/diagrams` → レスポンスの UUID で `/diagram/:id` にリダイレクト

### 4.2 クラス図作成ページ（`/diagram/:id`）

```
┌────────────────────────────────────────────────────────────┐
│ [Diagramerロゴ]  [保存済み✓]  ユーザー名[編集]  [URLをコピー]  [PlantUML出力] │ ← ツールバー（上部）
├───────────────────────────────────────────┬────────────────┤
│                                           │                │
│                                           │  プロパティ     │
│           キャンバス（React Flow）          │  サイドバー     │
│                                           │  （右端）       │
│  ノード・エッジを自由に配置                   │                │
│  パン: Space+ドラッグ                       │  選択中のノード  │
│  ズーム: Ctrl+スクロール                    │  の詳細編集     │
│                                           │                │
│                                           │                │
├───────────────────────────────────────────┴────────────────┤
│  [クラス] [インターフェース] [列挙型] [ノート] [パッケージ]      │ ← パレット（下部）
└────────────────────────────────────────────────────────────┘
```

---

## 5. UML要素仕様

### 5.1 ノード種別

#### クラス（Class）

```
┌─────────────────────┐
│   <<stereotype>>     │
│      ClassName       │
├─────────────────────┤
│  + attribute: Type   │
│  - attribute: Type   │
│  # attribute: Type   │
├─────────────────────┤
│  + method(): Type    │
│  - method(): Type    │
└─────────────────────┘
```

| プロパティ | 型 | 説明 |
|-----------|---|------|
| name | string | クラス名（インライン編集） |
| stereotype | string | `<<abstract>>` 等の任意テキスト |
| attributes | Attribute[] | 属性リスト |
| methods | Method[] | メソッドリスト |
| color | string | 背景色（HEXカラー） |
| size | {width, height} | ノードサイズ（ドラッグでリサイズ） |

#### インターフェース（Interface）

クラスと同一構造。`<<interface>>` ステレオタイプが自動付与される。編集UIはクラスと共通（属性欄も表示される）。

PlantUMLエクスポート時は `interface` キーワードで出力。

#### 列挙型（Enum）

```
┌─────────────────────┐
│     <<enumeration>>  │
│       EnumName       │
├─────────────────────┤
│  VALUE_A             │
│  VALUE_B             │
│  VALUE_C             │
└─────────────────────┘
```

| プロパティ | 型 | 説明 |
|-----------|---|------|
| name | string | 列挙型名 |
| values | EnumValue[] | 列挙値リスト（名前のみ） |
| color | string | 背景色 |
| size | {width, height} | ノードサイズ |

#### ノート（Note）

```
┌─────────────────────┐
│ テキストコメント内容   │
│                      │
└─────────────────────┘
```

| プロパティ | 型 | 説明 |
|-----------|---|------|
| content | string | テキスト内容 |
| color | string | 背景色 |
| size | {width, height} | ノードサイズ |

#### パッケージ（Package）

コンテナ型ノード。内部に他のノードを含められる。
- パッケージを移動すると内包ノードも連動して移動
- React Flowの `parentNode` 機能で子要素を管理
- 内包ノードのドラッグ&ドロップでパッケージへの追加/除外が可能

```
┌─────────────────────────────┐
│ PackageName                  │
│ ┌──────────┐ ┌──────────┐   │
│ │  Class A │ │  Class B │   │
│ └──────────┘ └──────────┘   │
└─────────────────────────────┘
```

| プロパティ | 型 | 説明 |
|-----------|---|------|
| name | string | パッケージ名 |
| color | string | 背景色 |
| size | {width, height} | ノードサイズ |

### 5.2 エッジ種別

| 種別 | 記法 | PlantUML記法 | 説明 |
|------|------|-------------|------|
| 関連（Association） | 実線 | `A -- B` | 一般的な関係 |
| 汎化（Generalization） | 実線＋白抜き三角 | `A --|> B` | 継承（A が B を継承） |
| 実現（Realization） | 破線＋白抜き三角 | `A ..|> B` | インターフェース実装 |
| 依存（Dependency） | 破線＋矢印 | `A ..> B` | 使用関係 |
| 集約（Aggregation） | 実線＋白抜きひし形 | `A "m" o-- "n" B` | 弱い全体-部分 |
| コンポジション（Composition） | 実線＋塗りひし形 | `A "m" *-- "n" B` | 強い全体-部分 |

#### エッジプロパティ

| プロパティ | 型 | 説明 |
|-----------|---|------|
| type | EdgeType | 上記6種別 |
| sourceMultiplicity | Multiplicity? | 始点側の多重度 |
| targetMultiplicity | Multiplicity? | 終点側の多重度 |

#### 多重度の選択肢

| 表示 | PlantUML出力 |
|------|-------------|
| `1` | `"1"` |
| `0..n` | `"0..*"` |
| `1..n` | `"1..*"` |
| `0..1` | `"0..1"` |
| （未設定） | 出力なし |

#### エッジの形状

全エッジ共通で**直角折れ線（Orthogonal）** スタイルを使用。React Flowの `smoothstep` エッジタイプを基本とする。

### 5.3 接続操作

1. ノードにマウスをホバー → ノード四辺に接続ハンドル（●）が出現
2. ハンドルからドラッグ → 別ノードにドロップ → 「関連（Association）」として接続
3. 接続後、エッジを選択 → 右サイドバーのセレクトボックスで種別変更
4. 多重度も右サイドバーで両端それぞれ設定

---

## 6. データモデル

### TypeScript型定義

```typescript
// ノード種別
type NodeType = 'class' | 'interface' | 'enum' | 'note' | 'package';

// エッジ種別
type EdgeType =
  | 'association'
  | 'generalization'
  | 'realization'
  | 'dependency'
  | 'aggregation'
  | 'composition';

// 多重度
type Multiplicity = '1' | '0..n' | '1..n' | '0..1';

// 可視性
type Visibility = '+' | '-' | '#' | '~';

// 属性
interface Attribute {
  id: string;
  visibility: Visibility;
  name: string;
  type: string;
}

// パラメータ
interface Parameter {
  name: string;
  type: string;
}

// メソッド
interface Method {
  id: string;
  visibility: Visibility;
  name: string;
  parameters: Parameter[];
  returnType: string;
}

// 列挙値
interface EnumValue {
  id: string;
  name: string;
}

// ノードデータの基底
interface BaseNodeData {
  color: string; // HEX e.g. '#FFFFFF'
}

// クラス・インターフェースノードデータ
interface ClassNodeData extends BaseNodeData {
  nodeType: 'class' | 'interface';
  name: string;
  stereotype: string; // interface の場合は '<<interface>>' が自動付与
  attributes: Attribute[];
  methods: Method[];
}

// 列挙型ノードデータ
interface EnumNodeData extends BaseNodeData {
  nodeType: 'enum';
  name: string;
  values: EnumValue[];
}

// ノートノードデータ
interface NoteNodeData extends BaseNodeData {
  nodeType: 'note';
  content: string;
}

// パッケージノードデータ
interface PackageNodeData extends BaseNodeData {
  nodeType: 'package';
  name: string;
}

// エッジデータ
interface DiagramEdgeData {
  edgeType: EdgeType;
  sourceMultiplicity?: Multiplicity;
  targetMultiplicity?: Multiplicity;
}

// ユーザープレゼンス（Yjs Awareness）
interface UserPresence {
  userId: string;        // 接続ごとに生成するランダムID
  name: string;          // デフォルト 'noname'
  color: string;         // ユーザーカラー（HEX）
  cursor: {
    x: number;
    y: number;
  } | null;
}
```

### Yjsデータ構造

```typescript
// Y.Doc の構造
const ydoc = new Y.Doc();

// ノードマップ: nodeId → NodeData（Y.Map）
const yNodes = ydoc.getMap<ClassNodeData | EnumNodeData | NoteNodeData | PackageNodeData>('nodes');

// React Flow のノード位置・サイズ: nodeId → {x, y, width, height}（Y.Map）
const yNodeLayout = ydoc.getMap<{ x: number; y: number; width: number; height: number; parentNode?: string }>('nodeLayout');

// エッジマップ: edgeId → EdgeData（Y.Map）
const yEdges = ydoc.getMap<{ source: string; target: string } & DiagramEdgeData>('edges');
```

---

## 7. データベーススキーマ

```sql
CREATE TABLE diagrams (
  id                UUID        PRIMARY KEY,
  yjs_state         BYTEA,      -- Yjs ドキュメントの圧縮バイナリ状態
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 最終アクセスから90日経過したレコードを削除するための定期バッチ用インデックス
CREATE INDEX idx_diagrams_last_accessed ON diagrams (last_accessed_at);
```

### データ保持ポリシー

- 最終アクセスから **90日** 経過したダイアグラムを自動削除
- 削除バッチは Node.js の `node-cron` で毎日0時に実行
- 削除クエリ: `DELETE FROM diagrams WHERE last_accessed_at < NOW() - INTERVAL '90 days'`
- ランディングページに「90日間アクセスがない場合、データは自動削除されます」と明示

---

## 8. API設計

### REST API

#### `POST /api/diagrams`
新規ダイアグラムを作成し、UUIDを返す。

**Request:** なし

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**処理:**
1. UUID v4 を生成
2. `diagrams` テーブルに空レコードを挿入（`yjs_state = NULL`）
3. `id` を返す

---

#### `GET /api/diagrams/:id`
ダイアグラムの存在確認。存在しない場合は 404。

**Response（存在する場合）:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-04-10T00:00:00Z"
}
```

**Response（存在しない場合）:**
```json
{ "error": "Diagram not found" }
```
ステータスコード: `404`

---

### WebSocket（y-websocket）

**エンドポイント:** `ws://host/yjs/:id`

y-websocket の標準プロトコルを使用。カスタム実装:
- 初回接続時: PostgreSQL から `yjs_state` を読み込み、Yjs ドキュメントを復元
- 更新受信時: デバウンス1秒後に `yjs_state` を PostgreSQL へ保存
- 更新受信時: `last_accessed_at` を即時更新
- 同時接続数が10人を超えた場合: WebSocket を `4429 Too Many Connections` で切断

---

## 9. リアルタイム同期仕様

### Yjs Awareness（プレゼンス）

各クライアントは Yjs の Awareness API で以下を共有する:

```typescript
provider.awareness.setLocalState({
  userId: nanoid(),    // 接続時に生成
  name: 'noname',      // 変更可能
  color: '#E53E3E',    // 入室順に自動割り当て
  cursor: { x: 0, y: 0 }
} satisfies UserPresence);
```

カーソルはキャンバス上のマウス移動イベントで継続的に更新。他ユーザーのカーソルは **ユーザー名付きの矢印**（ユーザーカラー）としてキャンバス上に描画。

### ユーザーカラーパレット（入室順に割り当て）

| 順番 | カラー | HEX |
|------|--------|-----|
| 1 | レッド | `#E53E3E` |
| 2 | ブルー | `#3182CE` |
| 3 | グリーン | `#38A169` |
| 4 | オレンジ | `#DD6B20` |
| 5 | パープル | `#805AD5` |
| 6 | ティール | `#319795` |
| 7 | ピンク | `#D53F8C` |
| 8 | イエロー | `#D69E2E` |
| 9 | インディゴ | `#5A67D8` |
| 10 | ダークグリーン | `#276749` |

### Undo/Redo

- Yjs の `UndoManager` を使用
- **per-userスコープ**（自分の操作のみ取り消し。他ユーザーの操作には影響しない）
- 追跡対象: `yNodes`・`yNodeLayout`・`yEdges`（全Yjsマップ）

```typescript
const undoManager = new Y.UndoManager(
  [yNodes, yNodeLayout, yEdges],
  { trackedOrigins: new Set([ydoc.clientID]) }
);
```

---

## 10. PlantUML出力仕様

### 出力フォーマット

```plantuml
@startuml

' パッケージ（コンテナ内のノードはネストして出力）
package PackageName {
  class ChildClass {
    + attribute: Type
    - method(): ReturnType
  }
}

' クラス
class ClassName <<stereotype>> {
  + publicAttr: String
  - privateAttr: int
  # protectedAttr: boolean
  ~ packageAttr: void
  + publicMethod(param: Type): ReturnType
}

' インターフェース
interface InterfaceName {
  + method(): ReturnType
}

' 列挙型
enum EnumName {
  VALUE_A
  VALUE_B
  VALUE_C
}

' 関連
ClassA -- ClassB
ClassA "1" -- "0..*" ClassB

' 汎化（継承）
ChildClass --|> ParentClass

' 実現（実装）
MyClass ..|> InterfaceName

' 依存
ClassA ..> ClassB

' 集約
Whole "1" o-- "0..*" Part

' コンポジション
Whole "1" *-- "0..*" Part

@enduml
```

### 多重度変換ルール

| UI表示 | PlantUML出力 |
|--------|-------------|
| `1` | `"1"` |
| `0..n` | `"0..*"` |
| `1..n` | `"1..*"` |
| `0..1` | `"0..1"` |
| （未設定） | 出力なし |

### 出力UI

1. ツールバーの「PlantUML出力」ボタンを押下
2. モーダルが開く
3. モーダル内にPlantUMLテキストが表示される（シンタックスハイライト付き）
4. 「コピー」ボタン → クリップボードにコピー
5. 「ダウンロード」ボタン → `diagram.puml` としてダウンロード

---

## 11. UI/UX仕様

### 11.1 ツールバー（上部）

左から右の順に配置:

| 要素 | 説明 |
|------|------|
| Diagramerロゴ | SVGアイコン + テキスト |
| 保存状態インジケーター | 「保存中...」「保存済み ✓」「保存エラー」を表示 |
| 現在のユーザー名 | クリックでインライン編集。デフォルトは `noname` |
| URLをコピーボタン | クリックでページURLをクリップボードにコピー |
| PlantUML出力ボタン | クリックでエクスポートモーダルを開く |

### 11.2 キャンバス（中部）

- React Flowの`ReactFlow`コンポーネントで構成
- 背景: ドットグリッドパターン（`<Background variant="dots" />`）
- ミニマップ: 右下に表示（`<MiniMap />`）
- ズームコントロール: 右下に表示（`<Controls />`）
- 他ユーザーのカーソルはSVGの矢印アイコン＋ユーザー名ラベルとして重ね描画

### 11.3 パレット（下部）

```
┌────────────────────────────────────────────────────────┐
│  [クラス]  [インターフェース]  [列挙型]  [ノート]  [パッケージ] │
└────────────────────────────────────────────────────────┘
```

- クリックでオブジェクト種別を選択状態にする
- 選択後にキャンバスをクリックするとその位置にノードが作成される
- 選択中の種別はハイライト表示

### 11.4 右サイドバー（プロパティパネル）

ノードまたはエッジを選択したときのみ表示。選択解除（`Escape`または空白クリック）で閉じる。

**ノード選択時（クラス/インターフェース）:**
```
─────────────────────
  プロパティ
─────────────────────
クラス名:   [ClassName   ]
ステレオ:   [<<abstract>>]
背景色:     [■ #FFFFFF   ]
─────────────────────
属性
─────────────────────
[+▾] [name    ] [Type    ] [✕]
[+▾] [name    ] [Type    ] [✕]
                           [+ 属性を追加]
─────────────────────
メソッド
─────────────────────
[+▾] [method()] [Type    ] [✕]
                           [+ メソッドを追加]
─────────────────────
```

**エッジ選択時:**
```
─────────────────────
  プロパティ
─────────────────────
種別:
[関連 ▾]
多重度（始点）:
[未設定 ▾]
多重度（終点）:
[0..n   ▾]
─────────────────────
```

### 11.5 キーボードショートカット

| ショートカット | 動作 |
|------------|------|
| `Ctrl+Z` | Undo（自分の直前の操作を取り消し） |
| `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | 選択中のノード/エッジを削除 |
| `Escape` | 選択解除・パレット選択解除 |
| `Space` + ドラッグ | キャンバスのパン |
| `Ctrl` + スクロール | ズームイン/アウト |
| `Ctrl+C` | 選択ノードをコピー |
| `Ctrl+V` | コピーしたノードをペースト（少しオフセットして配置） |

---

## 12. 非機能要件

| 項目 | 仕様 |
|------|------|
| 同時接続数上限 | 1ダイアグラムあたり最大10人。超過時は接続を切断しエラーメッセージ表示 |
| データ保持期間 | 最終アクセスから90日。ランディングページに明記 |
| 対応環境 | PCブラウザのみ（Chrome・Firefox・Safari・Edge最新版） |
| モバイル対応 | なし（PC専用） |
| テーマ | ライトモード固定 |
| 自動保存 | 最終操作から1秒後にデバウンス保存 |
| 認証 | なし（URLを知っている人がアクセス可能） |
| HTTPS | Nginx + Let's Encryptで対応 |

---

## 13. ディレクトリ構成

```
diagramer/
├── frontend/                        # React アプリ
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  # ルーティング（/ と /diagram/:id）
│   │   ├── pages/
│   │   │   ├── Landing.tsx          # ランディングページ
│   │   │   └── Diagram.tsx          # クラス図作成ページ
│   │   ├── components/
│   │   │   ├── Toolbar/
│   │   │   │   └── Toolbar.tsx
│   │   │   ├── Canvas/
│   │   │   │   ├── Canvas.tsx       # ReactFlow本体
│   │   │   │   ├── nodes/
│   │   │   │   │   ├── ClassNode.tsx
│   │   │   │   │   ├── EnumNode.tsx
│   │   │   │   │   ├── NoteNode.tsx
│   │   │   │   │   └── PackageNode.tsx
│   │   │   │   └── edges/
│   │   │   │       └── DiagramEdge.tsx
│   │   │   ├── Palette/
│   │   │   │   └── Palette.tsx
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── NodeProperties.tsx
│   │   │   │   └── EdgeProperties.tsx
│   │   │   ├── Cursors/
│   │   │   │   └── RemoteCursors.tsx
│   │   │   └── ExportModal/
│   │   │       └── ExportModal.tsx
│   │   ├── hooks/
│   │   │   ├── useYjsProvider.ts    # Yjs + y-websocket セットアップ
│   │   │   ├── useCollaboration.ts  # Awareness（カーソル・ユーザー名）
│   │   │   ├── useAutoSave.ts       # 保存状態管理
│   │   │   └── useUndoManager.ts    # per-user Undo/Redo
│   │   ├── types/
│   │   │   └── diagram.ts           # 型定義（共通）
│   │   └── utils/
│   │       ├── plantUmlExporter.ts  # PlantUML変換ロジック
│   │       └── colorPalette.ts      # ユーザーカラー管理
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                         # Node.js + Fastify
│   ├── src/
│   │   ├── index.ts                 # エントリポイント（Fastify + y-websocket）
│   │   ├── routes/
│   │   │   └── diagrams.ts          # POST /api/diagrams, GET /api/diagrams/:id
│   │   ├── db/
│   │   │   ├── index.ts             # PostgreSQL接続（pg）
│   │   │   └── migrations/
│   │   │       └── 001_init.sql
│   │   ├── websocket/
│   │   │   └── yjsHandler.ts        # y-websocket + DB永続化 + 接続数制限
│   │   └── cron/
│   │       └── cleanup.ts           # 90日経過ダイアグラムの定期削除
│   ├── tsconfig.json
│   └── package.json
│
├── nginx/
│   └── nginx.conf                   # リバースプロキシ設定
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── DESIGN.md                        # 本ドキュメント
```

---

## 14. Docker Compose構成

### 開発環境（`docker-compose.yml`）

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: diagramer
      POSTGRES_USER: diagramer
      POSTGRES_PASSWORD: diagramer
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/src/db/migrations:/docker-entrypoint-initdb.d

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    environment:
      DATABASE_URL: postgresql://diagramer:diagramer@postgres:5432/diagramer
      PORT: 3001
      NODE_ENV: development
    ports:
      - "3001:3001"
    volumes:
      - ./backend/src:/app/src
    depends_on:
      - postgres
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    environment:
      VITE_API_BASE_URL: http://localhost:3001
      VITE_WS_BASE_URL: ws://localhost:3001
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev

volumes:
  pgdata:
```

### 本番環境（`docker-compose.prod.yml`）

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: diagramer
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      PORT: 3001
      NODE_ENV: production
      MAX_CONNECTIONS_PER_DIAGRAM: 10
      DIAGRAM_TTL_DAYS: 90
    depends_on:
      - postgres
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
      - certbot-etc:/etc/letsencrypt
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
  certbot-etc:
```

### Nginx設定（主要部分）

```nginx
server {
    listen 80;
    server_name diagramer.example.com;

    # React静的ファイル
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # REST API
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
    }

    # WebSocket（y-websocket）
    location /yjs/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```
