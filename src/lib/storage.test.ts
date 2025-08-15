import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createFullChromeMock,
	setupGlobalChrome,
} from "../../tests/utils/helpers";
import type { ReadingItem } from "../types";
import { ReadingListStorage } from "./storage";

// Chrome API のモック
const mockChrome = createFullChromeMock();
setupGlobalChrome(mockChrome);

describe("ReadingListStorage", () => {
	let storage: ReadingListStorage;

	beforeEach(() => {
		storage = new ReadingListStorage();
		vi.clearAllMocks();
		// デフォルトの返り値を設定
		mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
		mockChrome.storage.sync.set.mockResolvedValue(undefined);
		mockChrome.storage.sync.remove.mockResolvedValue(undefined);
		mockChrome.storage.sync.getBytesInUse.mockResolvedValue(0);
	});

	describe("addItem", () => {
		it("正常なアイテムを追加できる", async () => {
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

		it("重複URLの場合は既存アイテムを更新する", async () => {
			const url = "https://example.com/article";
			const existingItem: ReadingItem = {
				id: "existing-id",
				url,
				title: "Old Title",
				addedAt: Date.now() - 10000, // 10秒前
			};

			mockChrome.storage.sync.get.mockResolvedValue({ items: [existingItem] });

			const item = await storage.addItem(url, "New Title");

			expect(item.id).toBe(existingItem.id);
			expect(item.title).toBe("New Title");
			expect(item.addedAt).toBeGreaterThan(existingItem.addedAt);
		});

		it("タイトルが255文字を超える場合は切り詰める", async () => {
			const url = "https://example.com";
			const longTitle = "a".repeat(300);

			const item = await storage.addItem(url, longTitle);

			expect(item.title.length).toBe(255);
			expect(item.title).toBe("a".repeat(255));
		});

		it("無効なURLの場合はエラーをスローする", async () => {
			await expect(storage.addItem("not-a-url", "Title")).rejects.toThrow(
				"Invalid URL",
			);
			await expect(
				storage.addItem("javascript:alert(1)", "Title"),
			).rejects.toThrow("Invalid URL");
		});

		it("512件の制限に達している場合はエラーをスローする", async () => {
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
		it("正常にアイテムを削除できる", async () => {
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

		it("存在しないアイテムを削除しようとしてもエラーにならない", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			await expect(storage.removeItem("non-existent")).resolves.not.toThrow();
		});
	});

	describe("getItems", () => {
		it("空の状態で空配列を返す", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			const items = await storage.getItems();

			expect(items).toEqual([]);
		});

		it("追加日時の降順でソートされたアイテムを返す", async () => {
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

		it("タイトルで部分一致検索ができる", async () => {
			const result = await storage.searchItems("Script");

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("item-1");
			expect(result[1].id).toBe("item-2");
		});

		it("URLで部分一致検索ができる", async () => {
			const result = await storage.searchItems("blog");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("item-2");
		});

		it("大文字小文字を無視して検索できる", async () => {
			const result = await storage.searchItems("JAVASCRIPT");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("item-1");
		});

		it("空文字列の場合は全件返す", async () => {
			const result = await storage.searchItems("");

			expect(result).toHaveLength(3);
		});

		it("検索結果も追加日時の降順でソートされる", async () => {
			const result = await storage.searchItems("example");

			expect(result).toHaveLength(3);
			expect(result[0].id).toBe("item-1");
			expect(result[1].id).toBe("item-2");
			expect(result[2].id).toBe("item-3");
		});
	});

	describe("getItemCount", () => {
		it("アイテム数を正しく返す", async () => {
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

		it("空の場合は0を返す", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			const count = await storage.getItemCount();

			expect(count).toBe(0);
		});
	});

	describe("ストレージ制限", () => {
		it("512件まで追加できる", async () => {
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

		it("513件目を追加しようとするとエラーになる", async () => {
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

	describe("エッジケースのテスト", () => {
		it("8000文字以上の長いURLを処理できる", async () => {
			const longUrl = `https://example.com/path?query=${"a".repeat(8000)}`;
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const result = await storage.addItem(longUrl, "Long URL Test");

			expect(result).toBeDefined();
			expect(result.url).toBe(longUrl);
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
		});

		it("日本語、絵文字を含むURLとタイトルを処理できる", async () => {
			const specialUrls = [
				{
					url: "https://example.com/日本語/パス",
					title: "日本語のタイトル",
				},
				{
					url: "https://example.com/emoji/🎉🚀",
					title: "絵文字タイトル 🎉🚀🌟",
				},
				{
					url: "https://example.com/mixed/混合😀パス",
					title: "Mixed 混合 Title 🔥",
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

		it("特殊文字を含むURLを正しくエンコード・デコードできる", async () => {
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

		it("空のタイトルでもアイテムを追加できる", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const result = await storage.addItem("https://example.com", "");

			expect(result).toBeDefined();
			expect(result.title).toBe("");
		});

		it("非常に長いタイトル（10000文字）を処理できる", async () => {
			const longTitle = "a".repeat(10000);
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const result = await storage.addItem("https://example.com", longTitle);

			expect(result).toBeDefined();
			// MAX_TITLE_LENGTH (255文字) に切り詰められることを確認
			expect(result.title).toBe("a".repeat(255));
		});

		it("同時に同じアイテムを削除しようとしても安全に処理される", async () => {
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
				// 2回目以降は空の配列を返す（既に削除済み）
				if (deleteCount > 0) {
					return Promise.resolve({ items: [] });
				}
				return Promise.resolve({ items });
			});

			mockChrome.storage.sync.set.mockImplementation(() => {
				deleteCount++;
				return Promise.resolve(undefined);
			});

			// 同時に2回削除を試みる
			const [result1, result2] = await Promise.allSettled([
				storage.removeItem(itemId),
				storage.removeItem(itemId),
			]);

			// 少なくとも1つは成功すべき
			const successes = [result1, result2].filter(
				(r) => r.status === "fulfilled",
			);
			expect(successes.length).toBeGreaterThanOrEqual(1);
		});

		it("未来の日付のアイテムも正しく処理される", async () => {
			const futureDate = Date.now() + 86400000 * 365; // 1年後
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

		it("負の日付（1970年以前）のアイテムも処理できる", async () => {
			const pastDate = -86400000; // 1970年1月1日の1日前
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

		it("不正なURL形式はエラーになる", async () => {
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

				// 不正なURLはエラーをスローすることを確認
				await expect(storage.addItem(url, "Invalid URL Test")).rejects.toThrow(
					"Invalid URL",
				);
			}
		});

		it("ストレージが空の状態で削除を試みてもエラーにならない", async () => {
			mockChrome.storage.sync.get.mockResolvedValue({ items: [] });

			await expect(
				storage.removeItem("non-existent-id"),
			).resolves.not.toThrow();
		});
	});
});
