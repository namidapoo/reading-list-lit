import { createFullChromeMock, setupGlobalChrome } from "@test-utils/helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "@/types";
import { ReadingListStorage } from "./storage";

// Chrome API mock
const mockChrome = createFullChromeMock();
setupGlobalChrome(mockChrome);

describe("ReadingListStorage", () => {
	let storage: ReadingListStorage;

	beforeEach(() => {
		storage = new ReadingListStorage();
		vi.clearAllMocks();
		// Set default return values
		mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
		mockChrome.storage.sync.set.mockResolvedValue(undefined);
		mockChrome.storage.sync.remove.mockResolvedValue(undefined);
		mockChrome.storage.sync.getBytesInUse.mockResolvedValue(0);
	});

	describe("addItem", () => {
		it("can add normal items", async () => {
			const url = "https://example.com/article";
			const title = "Test Article";

			const item = await storage.addItem(url, title);

			expect(item).toMatchObject({
				url,
				title,
				faviconUrl: expect.stringContaining("example.com"),
			});
			expect(item.id).toBeTruthy();
			expect(item.addedAt).toBeGreaterThan(0);
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				items: expect.arrayContaining([
					expect.objectContaining({ url, title }),
				]),
			});
		});

		it("updates existing item for duplicate URL", async () => {
			const url = "https://example.com/article";
			const existingItem: ReadingItem = {
				id: "existing-id",
				url,
				title: "Old Title",
				addedAt: Date.now() - 10000, // 10 seconds ago
			};

			mockChrome.storage.sync.get.mockResolvedValue({ items: [existingItem] });

			const item = await storage.addItem(url, "New Title");

			expect(item.id).toBe(existingItem.id);
			expect(item.title).toBe("New Title");
			expect(item.addedAt).toBeGreaterThan(existingItem.addedAt);
		});

		it("truncates title if exceeds 255 characters", async () => {
			const url = "https://example.com";
			const longTitle = "a".repeat(300);

			const item = await storage.addItem(url, longTitle);

			expect(item.title.length).toBe(255);
			expect(item.title).toBe("a".repeat(255));
		});

		it("throws error for invalid URLs", async () => {
			await expect(storage.addItem("not-a-url", "Title")).rejects.toThrow(
				"Invalid URL",
			);
			await expect(
				storage.addItem("javascript:alert(1)", "Title"),
			).rejects.toThrow("Invalid URL");
		});

		it("throws error when 512 item limit is reached", async () => {
			const items = Array.from({ length: 512 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Item ${i}`,
				addedAt: Date.now() - i,
			}));

			mockChrome.storage.sync.get.mockResolvedValue({ items });

			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).rejects.toThrow("Storage limit reached");
		});
	});

	describe("removeItem", () => {
		it("can remove items normally", async () => {
			const items: ReadingItem[] = [
				{
					id: "item-1",
					url: "https://example.com/1",
					title: "Item 1",
					addedAt: Date.now(),
				},
				{
					id: "item-2",
					url: "https://example.com/2",
					title: "Item 2",
					addedAt: Date.now(),
				},
			];

			mockChrome.storage.sync.get.mockResolvedValue({ items });

			await storage.removeItem("item-1");

			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				items: expect.arrayContaining([
					expect.objectContaining({ id: "item-2" }),
				]),
			});
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				items: expect.not.arrayContaining([
					expect.objectContaining({ id: "item-1" }),
				]),
			});
		});

		it("does not error when removing non-existent item", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			await expect(storage.removeItem("non-existent")).resolves.not.toThrow();
		});
	});

	describe("getItems", () => {
		it("returns empty array when empty", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			const items = await storage.getItems();

			expect(items).toEqual([]);
		});

		it("returns items sorted by added date in descending order", async () => {
			const now = Date.now();
			const items: ReadingItem[] = [
				{
					id: "item-1",
					url: "https://example.com/1",
					title: "Item 1",
					addedAt: now - 3000,
				},
				{
					id: "item-2",
					url: "https://example.com/2",
					title: "Item 2",
					addedAt: now - 1000,
				},
				{
					id: "item-3",
					url: "https://example.com/3",
					title: "Item 3",
					addedAt: now - 2000,
				},
			];

			mockChrome.storage.sync.get.mockResolvedValue({ items });

			const result = await storage.getItems();

			expect(result[0].id).toBe("item-2");
			expect(result[1].id).toBe("item-3");
			expect(result[2].id).toBe("item-1");
		});
	});

	describe("searchItems", () => {
		const items: ReadingItem[] = [
			{
				id: "item-1",
				url: "https://example.com/article",
				title: "JavaScript Tutorial",
				addedAt: Date.now(),
			},
			{
				id: "item-2",
				url: "https://blog.example.com/post",
				title: "TypeScript Guide",
				addedAt: Date.now() - 1000,
			},
			{
				id: "item-3",
				url: "https://docs.example.com/reference",
				title: "API Reference",
				addedAt: Date.now() - 2000,
			},
		];

		beforeEach(() => {
			mockChrome.storage.sync.get.mockResolvedValue({ items });
		});

		it("can search by partial title match", async () => {
			const result = await storage.searchItems("Script");

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("item-1");
			expect(result[1].id).toBe("item-2");
		});

		it("can search by partial URL match", async () => {
			const result = await storage.searchItems("blog");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("item-2");
		});

		it("can search case-insensitively", async () => {
			const result = await storage.searchItems("JAVASCRIPT");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("item-1");
		});

		it("returns all items for empty string", async () => {
			const result = await storage.searchItems("");

			expect(result).toHaveLength(3);
		});

		it("search results are also sorted by added date in descending order", async () => {
			const result = await storage.searchItems("example");

			expect(result).toHaveLength(3);
			expect(result[0].id).toBe("item-1");
			expect(result[1].id).toBe("item-2");
			expect(result[2].id).toBe("item-3");
		});
	});

	describe("getItemCount", () => {
		it("returns correct item count", async () => {
			const items = Array.from({ length: 42 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Item ${i}`,
				addedAt: Date.now(),
			}));

			mockChrome.storage.sync.get.mockResolvedValue({ items });

			const count = await storage.getItemCount();

			expect(count).toBe(42);
		});

		it("returns 0 when empty", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			const count = await storage.getItemCount();

			expect(count).toBe(0);
		});
	});

	describe("Storage limits", () => {
		it("can add up to 512 items", async () => {
			const items = Array.from({ length: 511 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Item ${i}`,
				addedAt: Date.now() - i,
			}));

			mockChrome.storage.sync.get.mockResolvedValue({ items });

			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).resolves.not.toThrow();
		});

		it("throws error when trying to add 513th item", async () => {
			const items = Array.from({ length: 512 }, (_, i) => ({
				id: `item-${i}`,
				url: `https://example.com/${i}`,
				title: `Item ${i}`,
				addedAt: Date.now() - i,
			}));

			mockChrome.storage.sync.get.mockResolvedValue({ items });

			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).rejects.toThrow("Storage limit reached");
		});
	});

	describe("Edge case tests", () => {
		it("can handle long URLs over 8000 characters", async () => {
			const longUrl = `https://example.com/path?query=${"a".repeat(8000)}`;
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const result = await storage.addItem(longUrl, "Long URL Test");

			expect(result).toBeDefined();
			expect(result.url).toBe(longUrl);
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
		});

		it("can handle URLs and titles with Japanese and emojis", async () => {
			const specialUrls = [
				{
					url: "https://example.com/japanese/path",
					title: "Japanese Title",
				},
				{
					url: "https://example.com/emoji/🎉🚀",
					title: "Emoji Title 🎉🚀🌟",
				},
				{
					url: "https://example.com/mixed/mixed😀path",
					title: "Mixed Title 🔥",
				},
			];

			for (const item of specialUrls) {
				mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
				mockChrome.storage.sync.set.mockResolvedValue(undefined);

				const result = await storage.addItem(item.url, item.title);

				expect(result).toBeDefined();
				expect(result.url).toBe(item.url);
				expect(result.title).toBe(item.title);
			}
		});

		it("can correctly encode and decode URLs with special characters", async () => {
			const specialChars = [
				"https://example.com/path?query=value&another=test",
				"https://example.com/path#fragment",
				"https://example.com/path?q=hello+world",
				"https://example.com/path?q=hello%20world",
				"https://example.com/[brackets]",
				"https://example.com/path?q=<script>alert('xss')</script>",
			];

			for (const url of specialChars) {
				mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
				mockChrome.storage.sync.set.mockResolvedValue(undefined);

				const result = await storage.addItem(url, "Special URL");

				expect(result).toBeDefined();
				expect(result.url).toBe(url);
			}
		});

		it("can add items with empty title", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const result = await storage.addItem("https://example.com", "");

			expect(result).toBeDefined();
			expect(result.title).toBe("");
		});

		it("can handle very long titles (10000 characters)", async () => {
			const longTitle = "a".repeat(10000);
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const result = await storage.addItem("https://example.com", longTitle);

			expect(result).toBeDefined();
			// Verify truncated to MAX_TITLE_LENGTH (255 characters)
			expect(result.title).toBe("a".repeat(255));
		});

		it("safely handles concurrent deletion of same item", async () => {
			const itemId = "duplicate-delete";
			const items = [
				{
					id: itemId,
					url: "https://example.com",
					title: "Test",
					addedAt: Date.now(),
				},
			];

			let deleteCount = 0;
			mockChrome.storage.sync.get.mockImplementation(() => {
				// Return empty array after first deletion
				if (deleteCount > 0) {
					return Promise.resolve({ items: [] });
				}
				return Promise.resolve({ items });
			});

			mockChrome.storage.sync.set.mockImplementation(() => {
				deleteCount++;
				return Promise.resolve(undefined);
			});

			// Try to delete twice concurrently
			const [result1, result2] = await Promise.allSettled([
				storage.removeItem(itemId),
				storage.removeItem(itemId),
			]);

			// At least one should succeed
			const successes = [result1, result2].filter(
				(r) => r.status === "fulfilled",
			);
			expect(successes.length).toBeGreaterThanOrEqual(1);
		});

		it("correctly handles items with future dates", async () => {
			const futureDate = Date.now() + 86400000 * 365; // 1 year later
			const item = {
				id: "future-item",
				url: "https://example.com",
				title: "Future Item",
				addedAt: futureDate,
			};

			mockChrome.storage.sync.get.mockResolvedValue({ items: [item] });

			const items = await storage.getItems();

			expect(items).toHaveLength(1);
			expect(items[0].addedAt).toBe(futureDate);
		});

		it("can handle items with negative dates (before 1970)", async () => {
			const pastDate = -86400000; // 1 day before January 1, 1970
			const item = {
				id: "past-item",
				url: "https://example.com",
				title: "Past Item",
				addedAt: pastDate,
			};

			mockChrome.storage.sync.get.mockResolvedValue({ items: [item] });

			const items = await storage.getItems();

			expect(items).toHaveLength(1);
			expect(items[0].addedAt).toBe(pastDate);
		});

		it("throws error for invalid URL formats", async () => {
			const invalidUrls = [
				"not-a-url",
				"//no-protocol.com",
				"http://",
				"ftp://example.com",
				"javascript:alert('test')",
				"data:text/html,<h1>test</h1>",
			];

			for (const url of invalidUrls) {
				mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
				mockChrome.storage.sync.set.mockResolvedValue(undefined);

				// Verify invalid URLs throw error
				await expect(storage.addItem(url, "Invalid URL Test")).rejects.toThrow(
					"Invalid URL",
				);
			}
		});

		it("does not error when trying to delete from empty storage", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			await expect(
				storage.removeItem("non-existent-id"),
			).resolves.not.toThrow();
		});
	});
});
