# Reading List Chrome 拡張機能 設計書

## 技術スタック

### 実装済み

- **言語**: TypeScript
- **パッケージマネージャー**: Bun
- **UI フレームワーク**: Lit
- **ビルドツール**: Vite
- **テスト**: Vitest（ブラウザモード with Playwright）
- **リンター/フォーマッター**: Biome
- **Git フック**: Lefthook

## アセット

### アイコン

拡張機能用のアイコンが以下のサイズで用意済み：

- `public/16.png` - ツールバー用（16×16px）
- `public/32.png` - Retina対応（32×32px）
- `public/48.png` - 拡張機能管理画面用（48×48px）
- `public/128.png` - Chrome Web Store用（128×128px）

manifest.jsonでこれらのアイコンを適切に参照する。

## 実装上の注意事項

### 既存ファイルの扱い

Vite + Litのテンプレートから生成された以下のファイルは削除して置き換える：

- `src/my-element.ts` - サンプルコンポーネント（不要）
- `src/my-button.ts` - サンプルコンポーネント（不要）
- `src/my-button.test.ts` - サンプルテスト（不要）
- `index.html` - Chrome拡張用の`popup.html`に置き換え

これらのファイルは本プロジェクトには不要なため、削除して新規に作成する。

## アーキテクチャ設計

### 全体構成

Chrome 拡張機能は以下の4つの主要コンポーネントで構成される：

1. **Background Script** - サービスワーカー（manifest.json で定義）
2. **Popup UI** - ポップアップ画面のLitコンポーネント
3. **Storage Layer** - データ永続化とChrome Sync連携
4. **Context Menu** - 右クリックメニューの処理

```
┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │ Background      │
│   (Lit)         │    │ Script          │
│                 │    │ (Service Worker)│
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────┐
         │ Storage Layer   │
         │ (chrome.storage)│
         └─────────────────┘
```

## コンポーネント設計

### 1. Background Script (`src/background.ts`)

**責務**: コンテキストメニューの管理、ポップアップとの通信

**主要機能**:

- 拡張機能インストール時のコンテキストメニュー作成（ページとリンク両方）
- コンテキストメニュークリック時の処理（R1.2, R1.3対応）
- ポップアップからのメッセージ受信処理

**API**:

```typescript
// コンテキストメニューからの保存処理（R1.2, R1.3対応）
interface SavePageMessage {
  type: "SAVE_PAGE";
  payload: {
    url: string;
    title: string;
    fromContextMenu: boolean;
    isLinkTarget?: boolean; // リンク先保存の場合true
  };
}
```

### 2. Storage Layer (`src/storage.ts`)

**責務**: データの永続化、Chrome Sync連携、ビジネスロジック

**主要クラス**:

```typescript
class ReadingListStorage {
  // データ操作
  async addItem(item: ReadingItem): Promise<void>;
  async removeItem(url: string): Promise<void>;
  async getItems(): Promise<ReadingItem[]>; // R2.1: 追加日時の降順でソート済み
  async searchItems(query: string): Promise<ReadingItem[]>; // R3.1, R3.2: 大文字小文字を区別しない部分一致検索

  // 内部処理
  private validateItem(item: ReadingItem): void;
  private sanitizeTitle(title: string): string;
  private generateFaviconUrl(url: string): string;
}

interface ReadingItem {
  url: string; // 一意識別子
  title: string; // ページタイトル
  addedAt: number; // Unix timestamp (ミリ秒)
  favicon?: string; // Favicon URL (オプション)
}
```

**ストレージ制約対応**:

- タイトルの長さ制限（200文字）
- アイテム数上限チェック（512件）
- 重複URL処理（既存を更新して最上部移動、R1.4対応）
- chrome.storage.sync自動同期（R5.1, R5.2対応）

### 3. Popup UI Components

#### メインコンポーネント (`src/popup.ts`)

**責務**: ポップアップ全体の状態管理と子コンポーネント連携

```typescript
@customElement("reading-list-popup")
class ReadingListPopup extends LitElement {
  @property({ type: Array }) items: ReadingItem[] = [];
  @property({ type: String }) searchQuery = "";
  @property({ type: Boolean }) isLoading = false;

  // 主要メソッド
  private async handleAddCurrent(): Promise<void>;
  private async handleDelete(url: string): Promise<void>;
  private handleSearch(query: string): void;
  private handleItemClick(url: string, event: MouseEvent): void;
}
```

#### 検索コンポーネント (`src/components/search-box.ts`)

**責務**: 検索入力の処理とフィルタリング

```typescript
@customElement("search-box")
class SearchBox extends LitElement {
  @property({ type: String }) value = "";

  private handleInput(e: InputEvent): void {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(
      new CustomEvent("search-changed", {
        detail: { query: this.value },
      })
    );
  }
}
```

#### アイテムリストコンポーネント (`src/components/item-list.ts`)

**責務**: 保存済みアイテムの一覧表示

```typescript
@customElement("item-list")
class ItemList extends LitElement {
  @property({ type: Array }) items: ReadingItem[] = [];

  private handleItemClick(item: ReadingItem, event: MouseEvent): void; // R4.1, R4.2: クリック・Ctrl/Cmd+クリック対応
  private handleDeleteClick(url: string, event: Event): void; // R4.3対応
  private formatDate(timestamp: number): string;
}
```

#### 個別アイテムコンポーネント (`src/components/reading-item.ts`)

**責務**: 単一の読書アイテムの表示と操作

```typescript
@customElement("reading-item")
class ReadingItem extends LitElement {
  @property({ type: Object }) item!: ReadingItem;

  private handleClick(event: MouseEvent): void;
  private handleDelete(event: Event): void;
}
```

## データフロー設計

### 1. アイテム追加フロー

```
ユーザー操作（R1.1-R1.3対応）
    ↓
[ポップアップ「+」ボタン] or [ページ右クリック] or [リンク右クリック]
    ↓
Background Script (コンテキストメニューの場合)
    ↓
Storage Layer.addItem()
    ↓
chrome.storage.sync.set() → 自動同期（R5.2）
    ↓
UI更新（storage change listener）
```

### 2. 検索フロー

```
SearchBox入力（R3.3: リアルタイム）
    ↓
search-changed イベント
    ↓
PopupメインコンポーネントでsearchQueryプロパティ更新
    ↓
Storage Layer.searchItems()（R3.1, R3.2: 大文字小文字無視の部分一致）
    ↓
フィルタリング済みアイテム配列
    ↓
ItemListコンポーネント更新（NF1.2: 100ms以内）
```

## UI/UX設計

### レイアウト構成

```
┌─────────────────────────────────────┐ ← Header (40px)
│ Reading List (512)          [+]     │
├─────────────────────────────────────┤
│ [🔍 Search articles...]            │ ← Search (40px)
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [favicon] Article Title         │ │ ← Item (48px each)
│ │ example.com • 2 hours ago    [×]│ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [favicon] Another Article       │ │
│ │ news.site.com • 1 day ago   [×]│ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤ ← Scrollable Area
│                ...                  │
└─────────────────────────────────────┘
Max: 800px × 600px（要件NF制約に準拠）
```

### スタイルシステム

**CSS カスタムプロパティ（ダークモード対応）**:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --accent-color: #0d6efd;
  --danger-color: #dc3545;
  --hover-bg: #e9ecef;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #b0b0b0;
    --border-color: #404040;
    --accent-color: #4dabf7;
    --danger-color: #ff6b6b;
    --hover-bg: #404040;
  }
}
```

### アニメーション設計

- **アイテム削除**: fade-out + slide-up (200ms)
- **アイテム追加**: fade-in + slide-down (200ms)
- **検索フィルタリング**: opacity transition (100ms)
- **ホバー効果**: background-color transition (150ms)

## セキュリティ設計

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://icons.duckduckgo.com"
  }
}
```

### 権限最小化

- `tabs`: 現在のタブ情報取得のみ
- `storage`: chrome.storage.sync使用
- `contextMenus`: 右クリックメニュー追加

### データサニタイゼーション

- URL検証（URL constructor使用）
- タイトル文字数制限とHTMLエスケープ
- favicon URL検証

## パフォーマンス設計

### 最適化戦略

1. **仮想化**: アイテム数が多い場合の仮想スクロール（将来拡張）
2. **検索デバウンス**: 100ms待機後に検索実行（NF1.2対応）
3. **キャッシュ戦略**: Storage Layer内でアイテムリストをキャッシュ（NF1.1, NF1.3対応）
4. **遅延ロード**: Favicon読み込みの非同期処理（NF1.1対応）

### メモリ管理

```typescript
class ReadingListStorage {
  private itemsCache: ReadingItem[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5000; // 5秒

  private async getFromCacheOrStorage(): Promise<ReadingItem[]> {
    const now = Date.now();
    if (this.itemsCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.itemsCache;
    }
    // Storage から取得してキャッシュ更新
  }
}
```

## テスト戦略

### 単体テスト範囲

- Storage Layer全メソッド
- 各Litコンポーネントのレンダリング
- ユーザーインタラクションハンドラー

### 統合テスト範囲

- ポップアップ全体のワークフロー
- コンテキストメニューからの保存
- Chrome Storage連携

### E2Eテスト範囲

- 実際のChrome拡張環境での動作確認
- マルチデバイス同期テスト

## エラーハンドリング設計

### エラー分類とハンドリング

```typescript
class ReadingListError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage: string
  ) {
    super(message);
  }
}

enum ErrorCode {
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  INVALID_URL = "INVALID_URL",
  NETWORK_ERROR = "NETWORK_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
}
```

### ユーザー向けエラーメッセージ

- 容量超過: "保存容量が上限に達しました。古いアイテムを削除してください。"
- ネットワークエラー: "接続エラーが発生しました。しばらく待ってから再試行してください。"
- 無効なURL: "無効なURLです。正しいページURLを確認してください。"
