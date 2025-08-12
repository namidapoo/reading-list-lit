# Reading List Chrome 拡張機能 実装タスクリスト

## 開発方針

### TDD（テスト駆動開発）アプローチ

各機能の実装は以下のTDDサイクルで進める：

1. **Red**: 失敗するテストを先に書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: コードをリファクタリング

各タスクでテストファースト、実装セカンドの順序を守る。

## Phase 1: 基盤構築

### 1.0 既存サンプルファイルの削除

以下のVite + Litテンプレートファイルは不要なため削除する：

- [x] `src/my-element.ts`を削除する
- [x] `src/my-button.ts`を削除する
- [x] `src/my-button.test.ts`を削除する
- [x] `index.html`を削除する（Chrome拡張用のpopup.htmlに置き換え）

### 1.1 プロジェクト構造とManifest設定

- [x] Chrome拡張用のVite設定を作成する
- [x] `public/manifest.json`を作成する（Manifest V3準拠）
- [x] アイコンの設定を追加する（16.png, 32.png, 48.png, 128.png）
- [x] 必要な権限（tabs, storage, contextMenus）を設定する
- [x] Content Security Policyを設定する
- [x] popup.htmlの基本構造を作成する
- [x] background.htmlの基本構造を作成する
- [x] Chrome拡張として正常にロードできることを確認する

### 1.2 TypeScript型定義

- [x] `src/types/index.ts`を作成する
- [x] `ReadingItem`インターフェースを定義する
- [x] `SavePageMessage`インターフェースを定義する
- [x] `ErrorCode` enumを定義する
- [x] `ReadingListError`クラスを定義する
- [x] TypeScriptコンパイルが通ることを確認する

## Phase 2: Storage Layer実装（TDD）

### 2.1 Storage Layerテスト作成

- [x] `src/storage.test.ts`を作成する
- [x] `addItem`メソッドのテストを書く
  - [x] 正常なアイテム追加のテスト
  - [x] 重複URL処理のテスト（R1.4）
  - [x] タイトル文字数制限のテスト
  - [x] 無効なURLのテスト
- [x] `removeItem`メソッドのテストを書く
  - [x] 正常な削除のテスト
  - [x] 存在しないアイテム削除のテスト
- [x] `getItems`メソッドのテストを書く
  - [x] 空の状態のテスト
  - [x] 追加日時降順ソートのテスト（R2.1）
- [x] `searchItems`メソッドのテストを書く
  - [x] タイトル部分一致のテスト（R3.1）
  - [x] URL部分一致のテスト（R3.1）
  - [x] 大文字小文字無視のテスト（R3.2）
- [x] `getItemCount`メソッドのテストを書く
- [x] ストレージ制限（512件）のテストを書く

### 2.2 Storage Layer実装

- [x] `src/storage.ts`を作成する
- [x] `ReadingListStorage`クラスを実装する
- [x] `addItem`メソッドを実装する
  - [x] URL検証ロジック
  - [x] タイトルサニタイゼーション
  - [x] 重複URL更新処理
  - [x] favicon URL生成
- [x] `removeItem`メソッドを実装する
- [x] `getItems`メソッドを実装する（ソート含む）
- [x] `searchItems`メソッドを実装する（大文字小文字無視）
- [x] `getItemCount`メソッドを実装する
- [x] キャッシュ機能を実装する
- [x] chrome.storage.sync連携を実装する
- [x] 全テストが通ることを確認する

## Phase 3: UI Components実装（TDD）

### 3.1 基本スタイリングシステム

- [x] `src/styles/globals.css`を作成する
- [x] CSS Custom Propertiesを定義する
- [x] ライトモード用の変数を定義する
- [x] ダークモード用の変数を定義する（NF4.3）
- [x] 共通アニメーション定義を追加する

### 3.2 SearchBoxコンポーネント（TDD）

- [x] `src/components/search-box.test.ts`を作成する
  - [x] レンダリングテストを書く
  - [x] 入力イベントテストを書く
  - [x] search-changedイベント発火テストを書く
  - [x] デバウンステストを書く（100ms）
- [x] `src/components/search-box.ts`を実装する
  - [x] Litコンポーネント基本構造
  - [x] 入力フィールド実装
  - [x] デバウンス処理実装
  - [x] イベント発火実装
- [x] スタイリングを適用する
- [x] 全テストが通ることを確認する

### 3.3 ReadingItemコンポーネント（TDD）

- [x] `src/components/reading-item.test.ts`を作成する
  - [x] レンダリングテストを書く（R2.2）
  - [x] 通常クリックテストを書く（R4.1）
  - [x] Ctrl/Cmd+クリックテストを書く（R4.2）
  - [x] 削除ボタンクリックテストを書く（R4.3）
  - [x] favicon表示テストを書く（R2.4）
- [x] `src/components/reading-item.ts`を実装する
  - [x] 基本構造とプロパティ定義
  - [x] タイトル・URL・日時表示
  - [x] favicon表示（DuckDuckGo API）
  - [x] クリックイベントハンドラー
  - [x] 削除イベントハンドラー
- [x] アニメーション効果を実装する
- [x] 全テストが通ることを確認する

### 3.4 ItemListコンポーネント（TDD）

- [x] `src/components/item-list.test.ts`を作成する
  - [x] 空状態表示テストを書く
  - [x] 複数アイテム表示テストを書く
  - [x] アイテムクリックイベント伝播テストを書く
  - [x] 削除イベント伝播テストを書く
- [x] `src/components/item-list.ts`を実装する
  - [x] 基本構造実装
  - [x] ReadingItemコンポーネント連携
  - [x] 空状態メッセージ表示
  - [x] スクロール可能エリア実装
- [x] 全テストが通ることを確認する

### 3.5 ReadingListPopupメインコンポーネント（TDD）

- [x] `src/popup.test.ts`を作成する
  - [x] ヘッダー表示テストを書く（R2.3）
  - [x] 「+」ボタンクリックテストを書く（R1.1）
  - [x] 検索連携テストを書く
  - [x] ローディング状態テストを書く
- [x] `src/popup.ts`を実装する
  - [x] ヘッダー実装（タイトル、カウント、追加ボタン）
  - [x] 子コンポーネント統合
  - [x] Storage Layer連携
  - [x] 状態管理実装
  - [x] ローディング表示実装
- [x] `popup.html`を完成させる
- [x] 全体レイアウトを確認する（最大800px×600px）
- [x] 全テストが通ることを確認する

## Phase 4: Background Script実装（TDD）

### 4.1 Background Scriptテスト作成

- [x] `src/background.test.ts`を作成する
  - [x] ServiceWorker起動テストを書く
  - [x] コンテキストメニュー作成テストを書く
  - [x] ページ保存処理テストを書く（R1.2）
  - [x] リンク保存処理テストを書く（R1.3）

### 4.2 Background Script実装

- [x] `src/background.ts`を作成する
- [x] chrome.runtime.onInstalled処理を実装する
- [x] ページ用コンテキストメニューを作成する
- [x] リンク用コンテキストメニューを作成する
- [x] コンテキストメニュークリック処理を実装する
- [x] Storage Layer連携を実装する
- [x] メッセージ通信処理を実装する
- [x] 全テストが通ることを確認する

## Phase 5: 統合とワークフロー実装

### 5.1 ポップアップ統合

- [x] Storage変更リスナーを実装する
- [x] 現在タブ情報取得を実装する
- [x] 「+」ボタンから現在タブ保存を実装する
- [x] 検索入力とフィルタリング連携を実装する（NF1.2: 100ms以内）
- [x] アイテムクリックでタブを開く処理を実装する
- [x] アイテム削除とUI更新を実装する
- [x] 統合テストを作成・実行する

### 5.2 Chrome Storage同期

- [x] storage.onChanged リスナーを実装する（R5.2）
- [x] UI自動更新処理を実装する
- [x] 同期エラーハンドリングを実装する
- [x] 複数デバイス間同期をテストする

## Phase 6: エラーハンドリングと最適化

### 6.1 エラーハンドリング実装

- [ ] エラー表示UIコンポーネントを作成する
- [ ] 容量超過エラー処理を実装する（NF3.1）
- [ ] ネットワークエラー処理を実装する
- [ ] 無効URL処理を実装する
- [ ] ユーザー向けメッセージ表示を実装する（NF4.2）
- [ ] エラー回復処理を実装する

### 6.2 パフォーマンス最適化

- [ ] ポップアップ表示時間を測定する
- [ ] 200ms以内の表示を達成する（NF1.1）
- [ ] 検索処理時間を測定する
- [ ] 100ms以内の検索を達成する（NF1.2）
- [ ] 512件での動作を確認する（NF1.3）
- [ ] キャッシュ効果を測定・調整する

## Phase 7: 品質保証

### 7.1 テストカバレッジ確認

- [ ] 単体テストカバレッジ90%以上を達成する
- [ ] 統合テストを完成させる
- [ ] E2Eテストシナリオを作成する
- [ ] 全テストスイートを実行する

### 7.2 最終品質チェック

- [ ] `bun check`で全ファイルをチェックする
- [ ] `bun check-types`で型チェックする
- [ ] `bun run test`で全テスト通過を確認する
- [ ] Chrome Developer Toolsでエラーがないことを確認する
- [ ] 要件書の全MVP機能が動作することを確認する
- [ ] Chrome Web Storeへの公開準備を完了する

## 進捗管理

各タスクは以下の流れで実装：

1. テストを書く（RED）
2. 実装する（GREEN）
3. リファクタリング（REFACTOR）
4. タスクにチェックを入れる
5. コミットする

この順序を守ることで、品質を保証しながら着実に実装を進める。
