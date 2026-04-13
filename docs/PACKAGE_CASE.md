# Package 関連 操作 / 挙動 一覧

Diagramer の Package（UML パッケージ）に関連する操作・挙動を、実装コード・UML 慣習・React Flow / Yjs / D1 / Cloudflare Workers の各層を横断して網羅的に列挙する。

リファクタ時の影響範囲チェックリスト、QA 時のテスト網羅リスト、新メンバーへの仕様共有として利用する。

---

## A. 作成

1. パレットの **Pkg** ボタンをクリックして Package 配置モードに入る
2. Package モードのままキャンバスをクリックして Package を新規生成
3. キーボード **P** で Package モードに切り替え
4. **Cmd+K** → CommandPalette から「Create Package」を実行
5. 複数ノード選択 → **Cmd+G** で選択範囲を内包する Package を自動生成（`handleGroupNodes`）
6. PlantUML インポートで `package Foo { class A }` を解析して Package と子を生成
7. Mermaid インポート（将来）で `namespace Foo { ... }` を Package として復元
8. **Cmd+V** ペーストで Package と子孫＋内部エッジを deep clone 複製
9. 右クリック「Duplicate」で Package を子孫ごと複製
10. Version History の Restore で過去スナップショットの Package を復元

## B. プロパティ編集

11. Package タブをダブルクリックしてインラインで名前編集
12. Sidebar の「Package Name」入力欄で名前変更
13. Sidebar のカラーピッカーで背景色（`color`）を変更
14. Sidebar の HEX 入力で色を直接指定
15. 名前編集中の **Enter** で確定 / **Escape** でキャンセル
16. 空名は trim でブロック（最後の有効値が保持）

## C. リサイズ

17. NodeResizer の 4 角ハンドルでドラッグしてリサイズ
18. NodeResizer の 4 辺ハンドルで 1 軸リサイズ
19. minWidth=150 / minHeight=100 の最小サイズ制約
20. リサイズ後、子ノードは `extent='parent'` で領域外に押し出されない

## D. 移動・ドラッグ

21. Package タブをドラッグして移動
22. Package 本体をドラッグして移動
23. 親=Package の子ノードが React Flow ネイティブの相対座標で追従
24. ドラッグ完了時 `onNodeDragStop` → `handleAutoReparent` 発火
25. Package を別 Package 上にドラッグしてネスト（親 Package 化）
26. Package を別 Package の外へドラッグして親 Package から離脱
27. 自分の子孫 Package は親候補から除外（循環防止）

## E. 自動親化・解除

28. ノードを Package 上にドロップして自動で子化
29. Package タブ領域 (-24px) も判定対象に含める（`PACKAGE_TAB_HEIGHT`）
30. パレットから Package 上クリックでノード作成 → 即子化
31. Canvas の `onNodeClick` で Package 上クリックを補完（`onPaneClick` が発火しない代替）
32. ノードを Package 外へドロップして自動で親解除
33. Package 移動で領域内に新たに入った非子孫ノードを自動子化
34. 複数 Package が重なる場合は最小面積（最内）を親に選択
35. ノードの中心座標ベースで判定（矩形重複ではない）

## F. 選択

36. Package タブのクリックで単一選択
37. Package 本体のクリックで単一選択
38. **Shift+クリック**で multi-selection に Package を追加
39. **Shift+ドラッグ** marquee で Package を含む範囲選択
40. **Esc** で選択解除
41. 選択時に Package の枠が青（`#4a9ce8`）に変わる
42. 選択時に NodeResizer のハンドルが表示

## G. 削除

43. **Delete / Backspace** で削除
44. 右クリック「Delete」で削除
45. Sidebar の「Delete Node」ボタンで削除
46. 複数選択削除で Package を一括削除
47. Package 削除と同時に Package を端点とするエッジも削除（`handleDeleteNode`）
48. 親=Package の子ノードも React Flow が連動削除

## H. グループ化／アングループ化

49. **Cmd+G** で選択ノードを新規 Package で囲む（`handleGroupNodes`）
50. グループ化対象は `parentId` の無いトップレベルノードのみ
51. 子ノードの bounding box から Package サイズを自動計算（padding=40, tabHeight=30）
52. グループ化時に子ノードの座標を相対化、`extent='parent'` を付与
53. **Cmd+Shift+G** で Package を Ungroup（`handleUngroupNodes`）
54. Ungroup 時に子ノードを top-level に戻し絶対座標に変換、`parentId`/`extent` を削除
55. Ungroup 完了で Package 自体は削除

## I. コピー・カット・ペースト・複製

56. **Cmd+C** で Package + 子孫 + 内部エッジを `structuredClone` で deep copy
57. **Cmd+X** で切り取り（コピー後に削除）
58. **Cmd+V** で現在のマウス位置に貼り付け
59. 右クリック「Paste」で pane クリック位置に貼り付け
60. Package 右クリック「Paste here」で Package 上にペースト → 自動子化
61. 右クリック「Duplicate」で子孫含めて複製（`copyOneNodeWithDescendants` + `handlePasteClipboard`）
62. クリップボードは ref で単純上書き → 直前のもののみ保持
63. ペースト時に新 ID を発行
64. コピー集合内の `parentId` は新 ID にリマップ（内部親子関係を維持）
65. 親 Package がコピー集合外なら `parentId`/`extent` を削除（外部親情報のクリア）
66. ペースト先の Package を `findContainingPackageAt` で判定して自動所属

## J. Z-order

67. Package は `zIndex: -1` で常に最背面に固定（`nodeFactory.ts`）
68. `handleChangeZOrder` は Package を無視（no-op）
69. Package 右クリックでは Z-order メニュー項目を非表示
70. 子ノードは React Flow の親子描画順で Package より前面
71. 複数 Package が重なる場合は作成順で重なる

## K. リアルタイム同期 (Yjs)

72. Package 作成・移動・リサイズが `yNodes.set` + `transact` で同期
73. Package 名・色変更が他クライアントへブロードキャスト
74. Package 削除が他クライアント DOM からも削除
75. CRDT 自動マージで複数同時編集の競合解決
76. `LOCAL_ORIGIN` チェックで自分の更新ループを防止

## L. 永続化 (D1 / DurableObject)

77. Package を含む Y.Doc 全体が `yjs_state` BLOB として D1 に保存
78. DurableObject の `alarm()` でデバウンス保存（1 秒後）
79. 全クライアント切断時に最終保存（`webSocketClose`）
80. Hibernation 復帰時に D1 から再ロードし Package を復元
81. `last_accessed_at` 更新

## M. バージョン管理

82. Snapshot 保存時に Package を含む全状態を保存
83. VersionPanel の Restore で過去状態に復元
84. DurableObject の `/restore` エンドポイント経由で接続中のクライアントへ broadcast

## N. エクスポート

85. PlantUML で `package PackageName { ... }` 構文に変換
86. Mermaid で `namespace PackageName { ... }` 構文に変換
87. PNG エクスポートで Package の枠・タブ・色・子要素を画像化
88. SVG エクスポートで Package を SVG マークアップに含める
89. `getNodesBounds` で Package もバウンディングに含めて画像サイズ算出
90. ネスト Package も再帰的に出力構文で表現

## O. インポート

91. `plantUmlImporter` が `package` キーワードを認識
92. Package と子の階層構造を維持してインポート
93. インポート直後に `fitView` で全体表示

## P. レイアウト

94. dagre Auto Layout 実行時に Package も考慮
95. `handleRelayout` で Package 含む全ノードの位置を単一トランザクション更新
96. `fitView` で Package 含む全体を viewport に収める
97. ZoomControls で Package を含む全体ズーム

## Q. 表示・スタイリング

98. `PackageNode.tsx` で選択状態に応じて枠色 / box-shadow を切替
99. タブ部分は `top: -24px` で本体の上に独立描画
100. 4 辺の Handle は hover で opacity アニメ表示
101. Package 本体は `opacity: 0.7` で中の要素が透けて見える
102. `rounded-tr-xl` + `rounded-b-xl` でタブ以外の角を丸く

## R. ハンドル・エッジ

103. Package の Top/Right/Bottom/Left に source/target Handle
104. Package を端点としたエッジを作成可能
105. Package と子ノード間のエッジ
106. Package 削除でそれを端点とするエッジを連動削除
107. Package 移動でエッジの始点/終点が再描画

## S. コメント

108. CommentLayer で Package 上にコメントピンを配置
109. Package の絶対座標基準でコメント位置を計算
110. コメントを resolved にして非表示化

## T. 検索

111. **Cmd+F** SearchBar で Package を名前で検索
112. 検索ヒット時に `search-hit` クラスでハイライト
113. 複数 Package がヒット時にすべてハイライト

## U. コマンドパレット

114. **Cmd+K** から「Group Selected」で Package を生成
115. CommandPalette の Create カテゴリに「Create Package」

## V. キーボードショートカット

116. **P** で Package モード
117. **Cmd+G** でグループ化
118. **Cmd+Shift+G** でアングループ化
119. **Delete/Backspace** で削除
120. **Cmd+Z** で Package 操作の Undo
121. **Cmd+Shift+Z** で Redo
122. **Esc** で選択解除

## W. コンテキストメニュー

123. Package 右クリックで Duplicate / Copy / Delete / Paste here
124. Package では Z-order メニュー（Bring Forward 等）を非表示
125. Pane 右クリックの Paste は Package 外クリック時のみ表示

## X. UX・アクセシビリティ

126. Package ドラッグ時のカーソル（grab）
127. Package モード時はキャンバス全体が `crosshair` カーソル
128. Package タブのフォントは M PLUS Rounded 1c bold
129. tabindex=0 で Tab キーで Package にフォーカス可
130. `role="group"` / `aria-roledescription="node"` でアクセシビリティ対応
131. ホバー時のみ Handle 表示でビューを邪魔しない
132. プレビューノード（半透明）が Package モード時にカーソル位置に表示

## Y. リモートコラボ・Awareness

133. リモートユーザーが Package を移動中の位置がリアルタイム反映
134. リモートユーザーのカーソルが Package 上に表示（CanvasCursors）
135. Follow mode でリモートユーザーの Package 編集を viewport 追従
136. ユーザー名バッジ + 色で「誰が編集中か」可視化

## Z. Undo/Redo

137. Package 作成・移動・削除・サイズ変更すべて Yjs UndoManager で記録
138. 1 transaction 内の操作はまとめて 1 ステップで undo
139. `handleGroupNodes`（Package 生成 + 子の再親化）は単一トランザクションで一括 undo
140. `handleImportDiagram`（複数 Package 含むインポート）も単一トランザクション

## AA. 内部ロジック (`packageHelpers.ts`)

141. `PACKAGE_TAB_HEIGHT = 24` 定数でタブ高さの統一
142. `getNodeAbsolutePos` でネスト Package の絶対座標を再帰計算
143. `isPointInPackageBounds` で点が Package 矩形（タブ含む）内かを判定
144. `findContainingPackageAt` で「最内」Package を面積 sort で選択
145. `collectWithDescendants` で子孫 ID 集合を反復で収集
146. `isDescendantOf` で循環参照ガード
147. `isNodeCenterInPackage` で中心ベース判定
148. `getPackageSize` で `style.width/height` のデフォルト補完

## BB. 制約・特殊挙動

149. パレットからの新規 Package は常に top-level 生成（他 Package にネストしない）
150. ドラッグによる既存 Package のネスト（Package を Package の中へ）は許可
151. Package のコピー時、ネスト Package（子孫）も同時に複製
152. `extent='parent'` は子ノード側にのみ設定、Package 自身には不要
153. Package サイズが固定で内部ノードがはみ出る場合は React Flow の制約で押し戻し
154. Auto-save が Package を含む全状態を保存
155. `data.nodeType === 'package'` で UI 側の型判定（Sidebar の出し分け等）
156. `nodeTypes.package` に `PackageNode` を登録（Canvas.tsx）

## CC. パレット / プレビュー

157. Palette の `selectedPalette === 'package'` で Pkg ボタンが青ハイライト
158. Package モード中は半透明プレビューがカーソルに追従（`previewNode`）
159. Package モード解除は Esc または別パレット選択 / クリック後の自動解除

## DD. Sidebar 連携

160. PackageProperties コンポーネントで Package 用 UI を表示
161. multi-selection が複数のときは Sidebar 自体を非表示（簡略表示に切替）
162. Package 選択時に Sidebar 上部に "PACKAGE" ヘッダー表示

---

**合計 162 項目**

## 補足: カテゴリ別 件数

| カテゴリ | 件数 |
|---|---|
| A. 作成 | 10 |
| B. プロパティ編集 | 6 |
| C. リサイズ | 4 |
| D. 移動・ドラッグ | 7 |
| E. 自動親化・解除 | 8 |
| F. 選択 | 7 |
| G. 削除 | 6 |
| H. グループ化／アングループ化 | 7 |
| I. コピー・カット・ペースト・複製 | 11 |
| J. Z-order | 5 |
| K. リアルタイム同期 (Yjs) | 5 |
| L. 永続化 (D1 / DurableObject) | 5 |
| M. バージョン管理 | 3 |
| N. エクスポート | 6 |
| O. インポート | 3 |
| P. レイアウト | 4 |
| Q. 表示・スタイリング | 5 |
| R. ハンドル・エッジ | 5 |
| S. コメント | 3 |
| T. 検索 | 3 |
| U. コマンドパレット | 2 |
| V. キーボードショートカット | 7 |
| W. コンテキストメニュー | 3 |
| X. UX・アクセシビリティ | 7 |
| Y. リモートコラボ・Awareness | 4 |
| Z. Undo/Redo | 4 |
| AA. 内部ロジック | 8 |
| BB. 制約・特殊挙動 | 8 |
| CC. パレット / プレビュー | 3 |
| DD. Sidebar 連携 | 3 |
