# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このプロジェクトは、Lit Web ComponentsとTypeScriptを使用したChrome拡張機能の読書リストアプリケーションです。ViteをビルドツールとしてBunパッケージマネージャーを使用しています。

## 必須コマンド

### 開発

```bash
bun dev          # 開発サーバーを起動
bun run build    # TypeScriptチェック後にプロダクションビルド
bun preview      # ビルド済みアプリのプレビュー
```

### コード品質

```bash
bun check             # Biomeでフォーマットとlintを一括チェック（自動修正あり）
bun format            # コードフォーマット
bun lint              # Lintエラーの確認
bun lint:fix          # Lintエラーの安全な自動修正
bun lint:fix:unsafe   # Lintエラーの安全でない修正も含む自動修正
bun check-types       # TypeScriptの型チェック（--noEmit）
```

### テスト

```bash
bun run test         # Vitestテストを実行
bun run test:watch   # テストをウォッチモードで実行
bun run test:ui      # Vitest UIを起動
bun run test:coverage # カバレッジレポート付きでテスト実行
```

## アーキテクチャとコード規約

### Litコンポーネント構造

- カスタムエレメントは`@customElement`デコレーターを使用
- プロパティは`@property`デコレーターで定義
- スタイルは`static styles`で定義
- 必ず`declare global`でHTMLElementTagNameMapに型を追加

### コーディング規約

- Biome設定：タブインデント、ダブルクォート使用
- TypeScript strict mode有効
- experimentalDecoratorsとuseDefineForClassFieldsの特殊設定に注意
- Lefthookでpre-commit時に自動フォーマット
- `any`型の使用は避ける（型安全性を保つため）
- Biomeのエラーや警告をignoreコメントで黙らせることは極力避ける（コード品質を保つため）

### テスト環境

- Vitest + Playwrightでブラウザ環境でのテスト
- `@vitest/browser/context`のpageオブジェクトを使用
- コンポーネントはdocument.bodyに直接マウントしてテスト

### 重要な設定

- package.jsonのpreinstallスクリプトでBun使用を強制
- Git hookはLefthookで管理（pre-commit/pre-push）
- ViteでESモジュールベースの開発環境構築

### コミットメッセージ規約

Conventional Commits形式に従ってください:

```
<type>(<scope>): <explanation>
```

タイプ: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
