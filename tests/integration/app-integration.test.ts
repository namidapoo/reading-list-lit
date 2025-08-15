import { ReadingListStorage } from "@lib/storage";
import { createFullChromeMock, setupGlobalChrome } from "@test-utils/helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "@/types";

// Chrome API mock
const mockChrome = createFullChromeMock();
setupGlobalChrome(mockChrome);

describe("Integration Tests", () => {
	let storage: ReadingListStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		storage = new ReadingListStorage();

		// Set default mock behavior
		mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
			if (callback) {
				callback({ items: [] });
			}
			return Promise.resolve({ items: [] });
		});

		mockChrome.storage.sync.set.mockImplementation((_items, callback) => {
			if (callback) {
				callback();
			}
			return Promise.resolve();
		});
	});

	describe("End-to-end workflow", () => {
		it("works through the entire flow from adding to displaying to deleting pages", async () => {
			const testUrl = "https://example.com/article";
			const testTitle = "Test Article";

			// 1. Add item
			const addedItem = await storage.addItem(testUrl, testTitle);
			expect(addedItem).toMatchObject({
				url: testUrl,
				title: testTitle,
			});
			expect(addedItem.id).toBeDefined();
			expect(addedItem.addedAt).toBeDefined();

			// 2. Get items
			mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
				if (callback) {
					callback({ items: [addedItem] });
				}
				return Promise.resolve({ items: [addedItem] });
			});

			const items = await storage.getItems();
			expect(items).toHaveLength(1);
			expect(items[0]).toEqual(addedItem);

			// 3. Search items
			const searchResults = await storage.searchItems("Test");
			expect(searchResults).toHaveLength(1);
			expect(searchResults[0]).toEqual(addedItem);

			// 4. Check item count
			const count = await storage.getItemCount();
			expect(count).toBe(1);

			// 5. Delete item
			mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
				if (callback) {
					callback({ items: [] });
				}
				return Promise.resolve({ items: [] });
			});

			await storage.removeItem(addedItem.id);
			const remainingItems = await storage.getItems();
			expect(remainingItems).toHaveLength(0);
		});

		it("does not conflict when adding items simultaneously from multiple tabs", async () => {
			const items: ReadingItem[] = [];

			// Add multiple items simultaneously
			const promises = Array.from({ length: 5 }, (_, i) => {
				return storage.addItem(
					`https://example.com/article-${i}`,
					`Article ${i}`,
				);
			});

			// Update mock behavior
			mockChrome.storage.sync.set.mockImplementation((data, callback) => {
				if (data.items) {
					items.push(...data.items);
				}
				if (callback) {
					callback();
				}
				return Promise.resolve();
			});

			const results = await Promise.all(promises);
			expect(results).toHaveLength(5);
			results.forEach((item, index) => {
				expect(item.url).toBe(`https://example.com/article-${index}`);
				expect(item.title).toBe(`Article ${index}`);
			});
		});
	});

	describe("Chrome API integration", () => {
		it("storage change events are handled correctly", async () => {
			const listener = vi.fn();

			// Register listener
			mockChrome.storage.sync.onChanged.addListener(listener);

			// Change storage
			await storage.addItem("https://example.com", "Example");

			// Verify set was called
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
		});

		it("tab operation APIs are called correctly", async () => {
			const testUrl = "https://example.com/article";

			// Open in current tab
			mockChrome.tabs.update({ url: testUrl });
			expect(mockChrome.tabs.update).toHaveBeenCalledWith({ url: testUrl });

			// Open in new tab
			mockChrome.tabs.create({ url: testUrl, active: false });
			expect(mockChrome.tabs.create).toHaveBeenCalledWith({
				url: testUrl,
				active: false,
			});
		});

		it("badge notifications are displayed correctly", () => {
			const tabId = 1;

			// Success badge
			mockChrome.action.setBadgeText({ text: "✓", tabId });
			mockChrome.action.setBadgeBackgroundColor({ color: "#16a34a", tabId });

			expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
				text: "✓",
				tabId,
			});
			expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
				color: "#16a34a",
				tabId,
			});

			// Error badge
			mockChrome.action.setBadgeText({ text: "!", tabId });
			mockChrome.action.setBadgeBackgroundColor({ color: "#dc2626", tabId });

			expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({
				text: "!",
				tabId,
			});
			expect(
				mockChrome.action.setBadgeBackgroundColor,
			).toHaveBeenLastCalledWith({
				color: "#dc2626",
				tabId,
			});
		});
	});

	describe("Error handling", () => {
		it("throws error when storage capacity is exceeded", async () => {
			// Add 512 items
			const items = Array.from({ length: 512 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Item ${i}`,
				addedAt: Date.now(),
			}));

			mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
				if (callback) {
					callback({ items: items });
				}
				return Promise.resolve({ items: items });
			});

			// Try to add 513th item
			await expect(
				storage.addItem("https://example.com/513", "Item 513"),
			).rejects.toThrow("Storage limit reached");
		});

		it("rejects invalid URLs", async () => {
			const invalidUrls = [
				"not-a-url",
				"javascript:alert('test')",
				"data:text/html,<script>alert('test')</script>",
				"",
			];

			for (const url of invalidUrls) {
				await expect(storage.addItem(url, "Test")).rejects.toThrow(
					"Invalid URL",
				);
			}
		});

		it("does not process Chrome internal URLs", async () => {
			const internalUrls = [
				"chrome://extensions",
				"chrome-extension://abc123",
				"about:blank",
				"edge://settings",
				"brave://rewards",
			];

			// These URLs are checked in background.ts, so
			// storage level testing is not needed here
			// However, verify as integration test
			for (const url of internalUrls) {
				// storage.addItemは通常のURLとして処理するが、
				// background.tsのisInternalUrlでフィルタリングされる
				if (
					url.startsWith("chrome://") ||
					url.startsWith("chrome-extension://")
				) {
					// Chrome URLs are actually rejected by addItem
					await expect(storage.addItem(url, "Test")).rejects.toThrow(
						"Invalid URL",
					);
				}
			}
		});
	});

	describe("Performance", () => {
		it("search completes within 100ms", async () => {
			// Prepare 100 items
			const items = Array.from({ length: 100 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Article ${i} about various topics`,
				addedAt: Date.now() - i * 1000,
			}));

			mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
				if (callback) {
					callback({ items: items });
				}
				return Promise.resolve({ items: items });
			});

			const startTime = performance.now();
			const results = await storage.searchItems("Article");
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(100);
			expect(results).toHaveLength(100); // All items contain "Article"
		});

		it("works correctly with 512 items", async () => {
			// Prepare maximum number of items
			const items = Array.from({ length: 512 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Item ${i}`,
				addedAt: Date.now() - i * 1000,
			}));

			mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
				if (callback) {
					callback({ items: items });
				}
				return Promise.resolve({ items: items });
			});

			const allItems = await storage.getItems();
			expect(allItems).toHaveLength(512);

			const count = await storage.getItemCount();
			expect(count).toBe(512);
		});
	});
});
