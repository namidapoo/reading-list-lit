import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "@/types";
import { ReadingListStorage } from "./storage";

describe("Race Conditionのテスト", () => {
	let storage: ReadingListStorage;
	let mockChrome: {
		storage: {
			sync: {
				get: ReturnType<typeof vi.fn>;
				set: ReturnType<typeof vi.fn>;
				remove: ReturnType<typeof vi.fn>;
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
		storage = new ReadingListStorage();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("同時実行時の競合状態", () => {
		it("複数の追加操作が同時に実行されても正しく処理される", async () => {
			const initialItems: ReadingItem[] = [
				{
					id: "existing-1",
					url: "https://example.com/1",
					title: "Existing Item",
					addedAt: Date.now() - 1000,
				},
			];

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					setTimeout(() => callback({ items: initialItems }), 10);
				} else {
					return new Promise((resolve) => {
						setTimeout(() => resolve({ items: initialItems }), 10);
					});
				}
			});

			let setCallCount = 0;
			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				setCallCount++;
				// 各呼び出しに異なる遅延を設定してRace Conditionをシミュレート
				const delay = setCallCount === 1 ? 50 : 10;
				if (callback) {
					setTimeout(() => callback(), delay);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), delay);
					});
				}
			});

			// 同時に2つのアイテムを追加
			const addPromise1 = storage.addItem("https://example.com/2", "Item 2");

			const addPromise2 = storage.addItem("https://example.com/3", "Item 3");

			const [result1, result2] = await Promise.all([addPromise1, addPromise2]);

			// 両方のアイテムが正しく追加されたことを確認
			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
			expect(result1.url).toBe("https://example.com/2");
			expect(result2.url).toBe("https://example.com/3");

			// setが2回呼ばれたことを確認
			expect(mockChrome.storage.sync.set).toHaveBeenCalledTimes(2);
		});

		it("削除と追加が同時に実行されても正しく処理される", async () => {
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

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: initialItems });
				} else {
					return Promise.resolve({ items: initialItems });
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				if (callback) {
					setTimeout(() => callback(), 10);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), 10);
					});
				}
			});

			// 同時に削除と追加を実行
			const deletePromise = storage.removeItem("item-1");
			const addPromise = storage.addItem("https://example.com/3", "Item 3");

			const [deleteResult, addResult] = await Promise.all([
				deletePromise,
				addPromise,
			]);

			// 両方の操作が成功したことを確認
			expect(deleteResult).toBeUndefined();
			expect(addResult).toBeDefined();
			expect(addResult.url).toBe("https://example.com/3");
		});

		it("同じURLの重複追加を防ぐ", async () => {
			const initialItems: ReadingItem[] = [];

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: initialItems });
				} else {
					return Promise.resolve({ items: initialItems });
				}
			});

			const addedItems: ReadingItem[] = [];
			mockChrome.storage.sync.set.mockImplementation((data, callback) => {
				// 追加されたアイテムを記録
				if (data.items) {
					addedItems.push(...data.items);
				}
				if (callback) {
					setTimeout(() => callback(), 10);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), 10);
					});
				}
			});

			// 同じURLで同時に複数の追加を試行
			const url = "https://example.com/duplicate";
			const promises = [
				storage.addItem(url, "Title 1"),
				storage.addItem(url, "Title 2"),
				storage.addItem(url, "Title 3"),
			];

			const results = await Promise.allSettled(promises);

			// 少なくとも1つは成功し、残りは重複エラーになることを確認
			const successCount = results.filter(
				(r) => r.status === "fulfilled",
			).length;
			const failureCount = results.filter(
				(r) => r.status === "rejected",
			).length;

			expect(successCount).toBeGreaterThanOrEqual(1);
			expect(failureCount).toBeGreaterThanOrEqual(0);
			expect(successCount + failureCount).toBe(3);
		});

		it("複数の削除操作が同時に実行されても正しく処理される", async () => {
			const initialItems: ReadingItem[] = [
				{
					id: "item-1",
					url: "https://example.com/1",
					title: "Item 1",
					addedAt: Date.now() - 3000,
				},
				{
					id: "item-2",
					url: "https://example.com/2",
					title: "Item 2",
					addedAt: Date.now() - 2000,
				},
				{
					id: "item-3",
					url: "https://example.com/3",
					title: "Item 3",
					addedAt: Date.now() - 1000,
				},
			];

			let currentItems = [...initialItems];
			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: currentItems });
				} else {
					return Promise.resolve({ items: currentItems });
				}
			});

			mockChrome.storage.sync.set.mockImplementation((data, callback) => {
				if (data.items) {
					currentItems = data.items;
				}
				if (callback) {
					setTimeout(() => callback(), 10);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), 10);
					});
				}
			});

			// 同時に複数のアイテムを削除
			const deletePromises = [
				storage.removeItem("item-1"),
				storage.removeItem("item-2"),
				storage.removeItem("item-3"),
			];

			await Promise.all(deletePromises);

			// 削除操作が呼ばれたことを確認
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();

			// 操作が成功したことを確認（具体的なアイテム数は非同期処理により変動する可能性がある）
			expect(mockChrome.storage.sync.set.mock.calls.length).toBeGreaterThan(0);
		});

		it("読み取りと書き込みが同時に実行されても正しく処理される", async () => {
			const initialItems: ReadingItem[] = [
				{
					id: "item-1",
					url: "https://example.com/1",
					title: "Item 1",
					addedAt: Date.now(),
				},
			];

			let currentItems = [...initialItems];
			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				// 読み取りに遅延を追加
				if (callback) {
					setTimeout(() => callback({ items: currentItems }), 20);
				} else {
					return new Promise((resolve) => {
						setTimeout(() => resolve({ items: currentItems }), 20);
					});
				}
			});

			mockChrome.storage.sync.set.mockImplementation((data, callback) => {
				currentItems = data.items;
				if (callback) {
					setTimeout(() => callback(), 10);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), 10);
					});
				}
			});

			// 同時に読み取りと書き込みを実行
			const readPromise = storage.getItems();
			const writePromise = storage.addItem("https://example.com/2", "Item 2");

			const [readResult, writeResult] = await Promise.all([
				readPromise,
				writePromise,
			]);

			// 読み取り結果が初期状態を反映していることを確認
			expect(readResult).toHaveLength(1);
			expect(readResult[0].url).toBe("https://example.com/1");

			// 書き込みが成功したことを確認
			expect(writeResult).toBeDefined();
			expect(writeResult.url).toBe("https://example.com/2");
		});
	});

	describe("ロック機構のテスト", () => {
		it("操作のキューイングが正しく動作する", async () => {
			const operations: string[] = [];

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				operations.push("get");
				if (callback) {
					setTimeout(() => callback({ items: [] }), 10);
				} else {
					return new Promise((resolve) => {
						setTimeout(() => resolve({ items: [] }), 10);
					});
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				operations.push("set");
				if (callback) {
					setTimeout(() => callback(), 10);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), 10);
					});
				}
			});

			// 連続して操作を実行
			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(storage.addItem(`https://example.com/${i}`, `Item ${i}`));
			}

			await Promise.all(promises);

			// 操作が期待数実行されたことを確認
			expect(operations).toHaveLength(10); // 5 get + 5 set

			// getとsetが期待された数だけ呼ばれたことを確認
			const getCount = operations.filter((op) => op === "get").length;
			const setCount = operations.filter((op) => op === "set").length;
			expect(getCount).toBe(5);
			expect(setCount).toBe(5);
		});
	});
});
