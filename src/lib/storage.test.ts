import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "../types";
import { ReadingListStorage } from "./storage";

// Chrome API のモック
const mockChromeStorage = {
	sync: {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn(),
		clear: vi.fn(),
		getBytesInUse: vi.fn(),
		onChanged: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		},
	},
	local: {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn(),
		clear: vi.fn(),
	},
};

// グローバルにchromeオブジェクトをモック
Object.assign(globalThis, {
	chrome: {
		storage: mockChromeStorage,
	},
});

describe("ReadingListStorage", () => {
	let storage: ReadingListStorage;

	beforeEach(() => {
		storage = new ReadingListStorage();
		vi.clearAllMocks();
		// デフォルトの返り値を設定
		mockChromeStorage.sync.get.mockResolvedValue({ items: [] });
		mockChromeStorage.sync.set.mockResolvedValue(undefined);
		mockChromeStorage.sync.remove.mockResolvedValue(undefined);
		mockChromeStorage.sync.getBytesInUse.mockResolvedValue(0);
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
			expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({
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

			mockChromeStorage.sync.get.mockResolvedValue({ items: [existingItem] });

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

			mockChromeStorage.sync.get.mockResolvedValue({ items });

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

			mockChromeStorage.sync.get.mockResolvedValue({ items });

			await storage.removeItem("item-1");

			expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({
				items: expect.arrayContaining([
					expect.objectContaining({ id: "item-2" }),
				]),
			});
			expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({
				items: expect.not.arrayContaining([
					expect.objectContaining({ id: "item-1" }),
				]),
			});
		});

		it("存在しないアイテムを削除しようとしてもエラーにならない", async () => {
			mockChromeStorage.sync.get.mockResolvedValue({ items: [] });

			await expect(storage.removeItem("non-existent")).resolves.not.toThrow();
		});
	});

	describe("getItems", () => {
		it("空の状態で空配列を返す", async () => {
			mockChromeStorage.sync.get.mockResolvedValue({ items: [] });

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

			mockChromeStorage.sync.get.mockResolvedValue({ items });

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
			mockChromeStorage.sync.get.mockResolvedValue({ items });
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

			mockChromeStorage.sync.get.mockResolvedValue({ items });

			const count = await storage.getItemCount();

			expect(count).toBe(42);
		});

		it("空の場合は0を返す", async () => {
			mockChromeStorage.sync.get.mockResolvedValue({ items: [] });

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

			mockChromeStorage.sync.get.mockResolvedValue({ items });

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

			mockChromeStorage.sync.get.mockResolvedValue({ items });

			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).rejects.toThrow("Storage limit reached");
		});
	});
});
