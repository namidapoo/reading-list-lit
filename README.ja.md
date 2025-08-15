# Reading List

[English](./README.md) | Japanese

記事やウェブページを後で読むために保存するChrome拡張機能。Lit Web ComponentsとTypeScriptで構築されています。

<img width="3428" height="2324" alt="CleanShot 2025-08-15 at 17 02 35@2x" src="https://github.com/user-attachments/assets/c0c0a1e4-34ef-496f-bc2b-3919b9596da3" />

## 機能

- 記事やウェブページを後で読むために保存
- ブラウザポップアップからクイックアクセス
- コンテキストメニュー統合
- Litコンポーネントを使用したクリーンでモダンなUI

## 技術スタック

- **フロントエンド**: Lit Web Components 3.3.1
- **言語**: TypeScript (ES2022)
- **ビルドツール**: Vite
- **パッケージマネージャー**: Bun
- **テスト**: Vitest + Playwright
- **リンター**: Biome

## インストール

### 前提条件

- [Bun](https://bun.sh/) (必須)
- Chromeブラウザ

### セットアップ

```bash
# 依存関係のインストール
bun install
```

## 開発

```bash
# プロダクションビルド
bun run build

# テストの実行
bun run test

# コード品質チェック
bun check
```

## 拡張機能のビルド

```bash
bun run build
```

ビルドされた拡張機能は `dist/` ディレクトリに出力されます。

## Chromeへの読み込み

1. Chromeを開き `chrome://extensions/` にアクセス
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` ディレクトリを選択

## スクリプト

| コマンド                | 説明                         |
| ----------------------- | ---------------------------- |
| `bun run build`         | プロダクションビルド         |
| `bun preview`           | ビルド済みアプリのプレビュー |
| `bun check`             | フォーマットとリントチェック |
| `bun format`            | コードフォーマット           |
| `bun lint`              | リントエラーの確認           |
| `bun lint:fix`          | リントエラーの自動修正       |
| `bun check-types`       | TypeScript型チェック         |
| `bun run test`          | テストを実行                 |
| `bun run test:watch`    | テストをウォッチモードで実行 |
| `bun run test:coverage` | カバレッジ付きでテスト実行   |

## ライセンス

MIT
