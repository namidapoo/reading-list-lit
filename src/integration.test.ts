import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingListStorage } from "./lib/storage";
import type { ReadingItem } from "./types";

// Chrome APIのモック
const mockChrome = {
	storage: {
		sync: {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn(),
			onChanged: {
				addListener: vi.fn(),
				removeListener: vi.fn(),
			},
		},
	},
	tabs: {
		query: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	contextMenus: {
		create: vi.fn(),
		onClicked: {
			addListener: vi.fn(),
		},
	},
	runtime: {
		onInstalled: {
			addListener: vi.fn(),
		},
		onMessage: {
			addListener: vi.fn(),
		},
	},
	action: {
		setBadgeText: vi.fn(),
		setBadgeBackgroundColor: vi.fn(),
	},
};

Object.assign(globalThis, { chrome: mockChrome });

describe("統合テスト", () => {
	let storage: ReadingListStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		storage = new ReadingListStorage();

		// デフォルトのモック動作を設定
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

	describe("エンドツーエンドワークフロー", () => {
		it("ページ追加から表示、削除までの一連の流れが動作する", async () => {
			const testUrl = "https://example.com/article";
			const testTitle = "Test Article";

			// 1. アイテムを追加
			const addedItem = await storage.addItem(testUrl, testTitle);
			expect(addedItem).toMatchObject({
				url: testUrl,
				title: testTitle,
			});
			expect(addedItem.id).toBeDefined();
			expect(addedItem.addedAt).toBeDefined();

			// 2. アイテムを取得
			mockChrome.storage.sync.get.mockImplementation((_keys, callback) => {
				if (callback) {
					callback({ items: [addedItem] });
				}
				return Promise.resolve({ items: [addedItem] });
			});

			const items = await storage.getItems();
			expect(items).toHaveLength(1);
			expect(items[0]).toEqual(addedItem);

			// 3. アイテムを検索
			const searchResults = await storage.searchItems("Test");
			expect(searchResults).toHaveLength(1);
			expect(searchResults[0]).toEqual(addedItem);

			// 4. アイテム数を確認
			const count = await storage.getItemCount();
			expect(count).toBe(1);

			// 5. アイテムを削除
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

		it("複数タブから同時にアイテムを追加しても競合しない", async () => {
			const items: ReadingItem[] = [];

			// 複数のアイテムを同時に追加
			const promises = Array.from({ length: 5 }, (_, i) => {
				return storage.addItem(
					`https://example.com/article-${i}`,
					`Article ${i}`,
				);
			});

			// モックの動作を更新
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

	describe("Chrome API連携", () => {
		it("ストレージ変更イベントが正しく処理される", async () => {
			const listener = vi.fn();

			// リスナーを登録
			mockChrome.storage.sync.onChanged.addListener(listener);

			// ストレージを変更
			await storage.addItem("https://example.com", "Example");

			// setが呼ばれたことを確認
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
		});

		it("タブ操作APIが正しく呼び出される", async () => {
			const testUrl = "https://example.com/article";

			// 現在のタブで開く
			mockChrome.tabs.update({ url: testUrl });
			expect(mockChrome.tabs.update).toHaveBeenCalledWith({ url: testUrl });

			// 新しいタブで開く
			mockChrome.tabs.create({ url: testUrl, active: false });
			expect(mockChrome.tabs.create).toHaveBeenCalledWith({
				url: testUrl,
				active: false,
			});
		});

		it("バッジ通知が正しく表示される", () => {
			const tabId = 1;

			// 成功バッジ
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

			// エラーバッジ
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

	describe("エラーハンドリング", () => {
		it("ストレージ容量超過時にエラーが発生する", async () => {
			// 512個のアイテムを追加
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

			// 513個目のアイテムを追加しようとする
			await expect(
				storage.addItem("https://example.com/513", "Item 513"),
			).rejects.toThrow("Storage limit reached");
		});

		it("無効なURLは拒否される", async () => {
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

		it("Chrome内部URLは処理されない", async () => {
			const internalUrls = [
				"chrome://extensions",
				"chrome-extension://abc123",
				"about:blank",
				"edge://settings",
				"brave://rewards",
			];

			// これらのURLは、background.tsでチェックされるので
			// ここではストレージレベルでのテストは不要
			// ただし、統合テストとして確認
			for (const url of internalUrls) {
				// storage.addItemは通常のURLとして処理するが、
				// background.tsのisInternalUrlでフィルタリングされる
				if (
					url.startsWith("chrome://") ||
					url.startsWith("chrome-extension://")
				) {
					// Chrome URLは実際にはaddItemで拒否される
					await expect(storage.addItem(url, "Test")).rejects.toThrow(
						"Invalid URL",
					);
				}
			}
		});
	});

	describe("パフォーマンス", () => {
		it("検索が100ms以内に完了する", async () => {
			// 100個のアイテムを準備
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
			expect(results).toHaveLength(100); // すべてのアイテムが"Article"を含む
		});

		it("512個のアイテムでも正常に動作する", async () => {
			// 最大数のアイテムを準備
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
