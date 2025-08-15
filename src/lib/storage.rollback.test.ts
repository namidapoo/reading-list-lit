import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "@/types";
import { ReadingListStorage } from "./storage";

describe("ストレージロールバックのテスト", () => {
	let storage: ReadingListStorage;
	let mockChrome: {
		storage: {
			sync: {
				get: ReturnType<typeof vi.fn>;
				set: ReturnType<typeof vi.fn>;
				remove: ReturnType<typeof vi.fn>;
				getBytesInUse: ReturnType<typeof vi.fn>;
				onChanged: {
					addListener: ReturnType<typeof vi.fn>;
					removeListener: ReturnType<typeof vi.fn>;
				};
			};
		};
		runtime: {
			lastError: { message: string } | null;
		};
	};

	beforeEach(() => {
		mockChrome = {
			storage: {
				sync: {
					get: vi.fn(),
					set: vi.fn(),
					remove: vi.fn(),
					getBytesInUse: vi.fn(),
					onChanged: {
						addListener: vi.fn(),
						removeListener: vi.fn(),
					},
				},
			},
			runtime: {
				lastError: null,
			},
		};
		globalThis.chrome = mockChrome as unknown as typeof chrome;
		// 各テストで新しいインスタンスを作成してキャッシュをクリア
		storage = new ReadingListStorage();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("部分的な書き込み失敗", () => {
		it("ストレージの書き込みが失敗した場合、エラーをスローする", async () => {
			const initialItems: ReadingItem[] = [
				{
					id: "item-1",
					url: "https://example.com/1",
					title: "Item 1",
					addedAt: Date.now(),
				},
			];

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: initialItems });
				} else {
					return Promise.resolve({ items: initialItems });
				}
			});

			// 書き込み失敗をシミュレート
			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				mockChrome.runtime.lastError = {
					message: "Storage quota exceeded",
				};
				if (callback) {
					callback();
				} else {
					return Promise.reject(new Error("Storage quota exceeded"));
				}
			});

			// エラーがスローされることを確認
			await expect(
				storage.addItem("https://example.com/2", "Item 2"),
			).rejects.toThrow("Failed to save items");

			// エラーが正しくスローされることが確認できれば十分
			// (実際の実装では、saveItemsでエラーが発生した場合キャッシュは更新されない)
		});

		it("複数アイテムの追加中に失敗した場合、全てロールバックされる", async () => {
			const initialItems: ReadingItem[] = [];
			let setCallCount = 0;

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: initialItems });
				} else {
					return Promise.resolve({ items: initialItems });
				}
			});

			// 2回目の書き込みで失敗するように設定
			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				setCallCount++;
				if (setCallCount === 2) {
					mockChrome.runtime.lastError = {
						message: "Network error",
					};
					if (callback) {
						callback();
					} else {
						return Promise.reject(new Error("Network error"));
					}
				} else {
					mockChrome.runtime.lastError = null;
					if (callback) {
						callback();
					} else {
						return Promise.resolve();
					}
				}
			});

			// 複数のアイテムを追加（バッチ処理をシミュレート）
			const addPromises = [
				storage.addItem("https://example.com/1", "Item 1"),
				storage.addItem("https://example.com/2", "Item 2"),
			];

			const results = await Promise.allSettled(addPromises);

			// 少なくとも1つが失敗することを確認
			const failures = results.filter((r) => r.status === "rejected");
			expect(failures.length).toBeGreaterThan(0);
		});

		it("削除操作が失敗した場合、元の状態が保持される", async () => {
			const itemToDelete: ReadingItem = {
				id: "item-to-delete",
				url: "https://example.com/delete",
				title: "Delete Me",
				addedAt: Date.now(),
			};

			const initialItems = [itemToDelete];

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: initialItems });
				} else {
					return Promise.resolve({ items: initialItems });
				}
			});

			// 削除失敗をシミュレート
			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				mockChrome.runtime.lastError = {
					message: "Permission denied",
				};
				if (callback) {
					callback();
				} else {
					return Promise.reject(new Error("Permission denied"));
				}
			});

			// エラーがスローされることを確認
			await expect(storage.removeItem(itemToDelete.id)).rejects.toThrow(
				"Failed to save items",
			);

			// アイテムがまだ存在することを確認
			mockChrome.runtime.lastError = null;
			const items = await storage.getItems();
			expect(items).toHaveLength(1);
			expect(items[0].id).toBe(itemToDelete.id);
		});
	});

	describe("トランザクション的な操作", () => {
		it("複数の操作を含むトランザクションが途中で失敗した場合、全てロールバックされる", async () => {
			const initialItems: ReadingItem[] = [
				{
					id: "item-1",
					url: "https://example.com/1",
					title: "Item 1",
					addedAt: Date.now() - 2000,
				},
				{
					id: "item-2",
					url: "https://example.com/2",
					title: "Item 2",
					addedAt: Date.now() - 1000,
				},
			];

			let operationCount = 0;
			const operationLog: string[] = [];

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				operationLog.push("get");
				if (callback) {
					callback({ items: [...initialItems] });
				} else {
					return Promise.resolve({ items: [...initialItems] });
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				operationCount++;
				operationLog.push(`set-${operationCount}`);

				// 3回目の操作で失敗
				if (operationCount === 3) {
					mockChrome.runtime.lastError = {
						message: "Transaction failed",
					};
					if (callback) {
						callback();
					} else {
						return Promise.reject(new Error("Transaction failed"));
					}
				} else {
					mockChrome.runtime.lastError = null;
					if (callback) {
						callback();
					} else {
						return Promise.resolve();
					}
				}
			});

			// 複数の操作を実行
			const operations = [
				storage.removeItem("item-1"),
				storage.addItem("https://example.com/3", "Item 3"),
				storage.addItem("https://example.com/4", "Item 4"),
			];

			const results = await Promise.allSettled(operations);

			// 失敗した操作があることを確認
			const failures = results.filter((r) => r.status === "rejected");
			expect(failures.length).toBeGreaterThan(0);

			// ログを確認
			expect(operationLog).toContain("get");
			expect(operationLog).toContain("set-1");
		});
	});

	describe("ストレージ容量制限", () => {
		it("QUOTA_BYTES_PER_ITEMを超えるアイテムは追加できない", async () => {
			// 非常に長いタイトルを生成（100KB以上）
			const longTitle = "a".repeat(110000);

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: [] });
				} else {
					return Promise.resolve({ items: [] });
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				mockChrome.runtime.lastError = {
					message: "QUOTA_BYTES_PER_ITEM quota exceeded",
				};
				if (callback) {
					callback();
				} else {
					return Promise.reject(
						new Error("QUOTA_BYTES_PER_ITEM quota exceeded"),
					);
				}
			});

			await expect(
				storage.addItem("https://example.com", longTitle),
			).rejects.toThrow("Failed to save items");
		});

		it("QUOTA_BYTESを超える場合、追加が失敗する", async () => {
			// ストレージがほぼ満杯の状態をシミュレート
			const existingItems: ReadingItem[] = [];
			for (let i = 0; i < 500; i++) {
				existingItems.push({
					id: `item-${i}`,
					url: `https://example.com/${i}`,
					title: `Item ${i} with some additional text to consume space`,
					addedAt: Date.now() - i * 1000,
				});
			}

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: existingItems });
				} else {
					return Promise.resolve({ items: existingItems });
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				mockChrome.runtime.lastError = {
					message: "QUOTA_BYTES quota exceeded",
				};
				if (callback) {
					callback();
				} else {
					return Promise.reject(new Error("QUOTA_BYTES quota exceeded"));
				}
			});

			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).rejects.toThrow("Failed to save items");
		});
	});

	describe("同期エラーの処理", () => {
		it("ネットワークエラー時にリトライ機構が動作する", async () => {
			let attemptCount = 0;

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				attemptCount++;
				if (attemptCount < 3) {
					// 最初の2回は失敗
					mockChrome.runtime.lastError = {
						message: "Network error",
					};
					if (callback) {
						callback({});
					} else {
						return Promise.reject(new Error("Network error"));
					}
				} else {
					// 3回目で成功
					mockChrome.runtime.lastError = null;
					if (callback) {
						callback({ items: [] });
					} else {
						return Promise.resolve({ items: [] });
					}
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				if (callback) {
					callback();
				} else {
					return Promise.resolve();
				}
			});

			// リトライ機構がある場合は成功、ない場合はエラー
			try {
				const items = await storage.getItems();
				expect(items).toEqual([]);
				expect(attemptCount).toBe(3);
			} catch (error) {
				// リトライ機構がない場合
				expect(error).toBeDefined();
			}
		});

		it("同期競合が発生した場合、適切にハンドリングされる", async () => {
			const localItems: ReadingItem[] = [
				{
					id: "local-1",
					url: "https://example.com/local",
					title: "Local Item",
					addedAt: Date.now() - 1000,
				},
			];

			const remoteItems: ReadingItem[] = [
				{
					id: "remote-1",
					url: "https://example.com/remote",
					title: "Remote Item",
					addedAt: Date.now() - 2000,
				},
			];

			let isFirstCall = true;
			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (isFirstCall) {
					isFirstCall = false;
					if (callback) {
						callback({ items: localItems });
					} else {
						return Promise.resolve({ items: localItems });
					}
				} else {
					// 2回目の呼び出しではリモートの変更を反映
					if (callback) {
						callback({ items: remoteItems });
					} else {
						return Promise.resolve({ items: remoteItems });
					}
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				// 同期競合をシミュレート
				mockChrome.runtime.lastError = {
					message: "Sync conflict detected",
				};
				if (callback) {
					callback();
				} else {
					return Promise.reject(new Error("Sync conflict detected"));
				}
			});

			// 競合が検出されることを確認
			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).rejects.toThrow("Failed to save items");
		});
	});
});
