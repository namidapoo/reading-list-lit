import type { ReadingItem } from "@/types";

/**
 * Generate basic ReadingItem
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
 * Generate multiple ReadingItems
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
 * Fixed dataset for testing
 */
export const fixtures = {
	// Basic item
	basicItem: createMockItem(),

	// Item without favicon
	itemWithoutFavicon: createMockItem({
		faviconUrl: undefined,
	}),

	// Item with long title
	itemWithLongTitle: createMockItem({
		title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(
			10,
		),
	}),

	// Item with long URL
	itemWithLongUrl: createMockItem({
		url: `https://example.com/very/long/path/${"segment/".repeat(100)}`,
	}),

	// Item with Japanese text
	itemWithJapanese: createMockItem({
		title: "Japanese Title",
		url: "https://example.com/japanese/path",
	}),

	// Item with emojis
	itemWithEmoji: createMockItem({
		title: "Article with emojis 🎉🚀🌟",
		url: "https://example.com/emoji/🎉",
	}),

	// Item with special characters
	itemWithSpecialChars: createMockItem({
		title: "Title with <script>alert('xss')</script>",
		url: "https://example.com/path?query=<>&\"'",
	}),

	// Item with future date
	itemFromFuture: createMockItem({
		addedAt: Date.now() + 86400000, // 1 day later
	}),

	// Item with past date
	itemFromPast: createMockItem({
		addedAt: Date.now() - 86400000 * 365, // 1 year ago
	}),

	// Malicious item with JavaScript protocol
	maliciousItem: createMockItem({
		url: "javascript:alert('XSS')",
		faviconUrl: "javascript:alert('XSS')",
	}),

	// Set of multiple items
	itemList: createMockItems(5),

	// Large set of items (for performance testing)
	largeItemList: createMockItems(500),

	// Item set at storage limit
	maxItemList: createMockItems(512),
};

/**
 * Chrome API error messages
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
 * URL pattern test cases
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
		"https://example.com/japanese/path",
		"https://example.com/emoji/🎉🚀",
		"https://example.com/path?q=hello+world",
		"https://example.com/path?q=hello%20world",
		"https://example.com/[brackets]",
		"https://example.com/path?q=<script>alert('xss')</script>",
	],
};

/**
 * Search query test cases
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
	unicode: ["Japanese", "nihongo", "🎉", "Search 🔍 Test 🎉"],
	edge: ["", "   ", "\n", "\t", "a".repeat(1000)],
};

/**
 * Timing constants
 */
export const timings = {
	debounce: 100,
	animationDelay: 250,
	networkTimeout: 5000,
	badgeClearDelay: 3000,
	errorAutoHide: 3000,
};
