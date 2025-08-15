import type { ReadingItem } from "@/types";

/**
 * 基本的なReadingItemを生成
 */
export function createMockItem(overrides?: Partial<ReadingItem>): ReadingItem {
	return {
		id: "test-id-1",
		url: "https://example.com",
		title: "Test Article",
		faviconUrl: "https://example.com/favicon.ico",
		addedAt: Date.now(),
		...overrides,
	};
}

/**
 * 複数のReadingItemを生成
 */
export function createMockItems(
	count: number,
	baseOverrides?: Partial<ReadingItem>,
): ReadingItem[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `test-id-${i + 1}`,
		url: `https://example.com/article-${i + 1}`,
		title: `Test Article ${i + 1}`,
		faviconUrl: `https://example.com/favicon-${i + 1}.ico`,
		addedAt: Date.now() - i * 1000,
		...baseOverrides,
	}));
}

/**
 * テスト用の固定データセット
 */
export const fixtures = {
	// 基本的なアイテム
	basicItem: createMockItem(),

	// faviconなしのアイテム
	itemWithoutFavicon: createMockItem({
		faviconUrl: undefined,
	}),

	// 長いタイトルのアイテム
	itemWithLongTitle: createMockItem({
		title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(
			10,
		),
	}),

	// 長いURLのアイテム
	itemWithLongUrl: createMockItem({
		url: `https://example.com/very/long/path/${"segment/".repeat(100)}`,
	}),

	// 日本語を含むアイテム
	itemWithJapanese: createMockItem({
		title: "日本語のタイトル",
		url: "https://example.com/日本語/パス",
	}),

	// 絵文字を含むアイテム
	itemWithEmoji: createMockItem({
		title: "Article with emojis 🎉🚀🌟",
		url: "https://example.com/emoji/🎉",
	}),

	// 特殊文字を含むアイテム
	itemWithSpecialChars: createMockItem({
		title: "Title with <script>alert('xss')</script>",
		url: "https://example.com/path?query=<>&\"'",
	}),

	// 未来の日付のアイテム
	itemFromFuture: createMockItem({
		addedAt: Date.now() + 86400000, // 1日後
	}),

	// 過去の日付のアイテム
	itemFromPast: createMockItem({
		addedAt: Date.now() - 86400000 * 365, // 1年前
	}),

	// JavaScriptプロトコルを含む悪意のあるアイテム
	maliciousItem: createMockItem({
		url: "javascript:alert('XSS')",
		faviconUrl: "javascript:alert('XSS')",
	}),

	// 複数アイテムのセット
	itemList: createMockItems(5),

	// 大量アイテムのセット（パフォーマンステスト用）
	largeItemList: createMockItems(500),

	// ストレージ上限のアイテムセット
	maxItemList: createMockItems(512),
};

/**
 * Chrome APIエラーメッセージ
 */
export const errorMessages = {
	quotaExceeded: "QUOTA_BYTES quota exceeded",
	quotaPerItem: "QUOTA_BYTES_PER_ITEM quota exceeded",
	networkError: "Network error",
	permissionDenied: "Permission denied",
	storageCorrupted: "Storage corrupted",
	syncConflict: "Sync conflict detected",
	runtime: "Unknown runtime error",
};

/**
 * URLパターンのテストケース
 */
export const urlPatterns = {
	valid: [
		"https://example.com",
		"http://example.com",
		"https://example.com/path",
		"https://example.com/path?query=value",
		"https://example.com/path#fragment",
		"https://sub.example.com",
		"https://example.com:8080",
	],
	invalid: [
		"not-a-url",
		"//no-protocol.com",
		"http://",
		"ftp://example.com",
		"javascript:alert('test')",
		"data:text/html,<h1>test</h1>",
		"file:///etc/passwd",
	],
	special: [
		"https://example.com/日本語/パス",
		"https://example.com/emoji/🎉🚀",
		"https://example.com/path?q=hello+world",
		"https://example.com/path?q=hello%20world",
		"https://example.com/[brackets]",
		"https://example.com/path?q=<script>alert('xss')</script>",
	],
};

/**
 * 検索クエリのテストケース
 */
export const searchQueries = {
	normal: ["test", "article", "example", "hello world"],
	regexSpecial: [
		".*+?[]{}()|^$\\",
		"test.*",
		"[abc]",
		"(group)",
		"item|test",
		"^start",
		"end$",
		"escape\\test",
	],
	unicode: ["日本語", "にほんご", "🎉", "検索 🔍 テスト 🎉"],
	edge: ["", "   ", "\n", "\t", "a".repeat(1000)],
};

/**
 * タイミング定数
 */
export const timings = {
	debounce: 100,
	animationDelay: 250,
	networkTimeout: 5000,
	badgeClearDelay: 3000,
	errorAutoHide: 3000,
};
