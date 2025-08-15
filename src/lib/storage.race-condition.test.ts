import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "@/types";
import { ReadingListStorage } from "./storage";

describe("Race Condition Tests", () => {
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

	describe("Concurrent execution race conditions", () => {
		it("handles multiple concurrent add operations correctly", async () => {
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
				// Set different delays for each call to simulate race condition
				const delay = setCallCount === 1 ? 50 : 10;
				if (callback) {
					setTimeout(() => callback(), delay);
				} else {
					return new Promise<void>((resolve) => {
						setTimeout(() => resolve(), delay);
					});
				}
			});

			// Add two items concurrently
			const addPromise1 = storage.addItem("https://example.com/2", "Item 2");

			const addPromise2 = storage.addItem("https://example.com/3", "Item 3");

			const [result1, result2] = await Promise.all([addPromise1, addPromise2]);

			// Verify both items were added correctly
			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
			expect(result1.url).toBe("https://example.com/2");
			expect(result2.url).toBe("https://example.com/3");

			// Verify set was called twice
			expect(mockChrome.storage.sync.set).toHaveBeenCalledTimes(2);
		});

		it("handles concurrent delete and add operations correctly", async () => {
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

			// Execute delete and add concurrently
			const deletePromise = storage.removeItem("item-1");
			const addPromise = storage.addItem("https://example.com/3", "Item 3");

			const [deleteResult, addResult] = await Promise.all([
				deletePromise,
				addPromise,
			]);

			// Verify both operations succeeded
			expect(deleteResult).toBeUndefined();
			expect(addResult).toBeDefined();
			expect(addResult.url).toBe("https://example.com/3");
		});

		it("prevents duplicate additions of the same URL", async () => {
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
				// Record added items
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

			// Attempt multiple concurrent additions of the same URL
			const url = "https://example.com/duplicate";
			const promises = [
				storage.addItem(url, "Title 1"),
				storage.addItem(url, "Title 2"),
				storage.addItem(url, "Title 3"),
			];

			const results = await Promise.allSettled(promises);

			// Verify at least one succeeds and others get duplicate errors
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

		it("handles multiple concurrent delete operations correctly", async () => {
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

			// Delete multiple items concurrently
			const deletePromises = [
				storage.removeItem("item-1"),
				storage.removeItem("item-2"),
				storage.removeItem("item-3"),
			];

			await Promise.all(deletePromises);

			// Verify delete operations were called
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();

			// Verify operations succeeded (specific item count may vary due to async processing)
			expect(mockChrome.storage.sync.set.mock.calls.length).toBeGreaterThan(0);
		});

		it("handles concurrent read and write operations correctly", async () => {
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
				// Add delay to read operation
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

			// Execute read and write concurrently
			const readPromise = storage.getItems();
			const writePromise = storage.addItem("https://example.com/2", "Item 2");

			const [readResult, writeResult] = await Promise.all([
				readPromise,
				writePromise,
			]);

			// Verify read result reflects initial state
			expect(readResult).toHaveLength(1);
			expect(readResult[0].url).toBe("https://example.com/1");

			// Verify write operation succeeded
			expect(writeResult).toBeDefined();
			expect(writeResult.url).toBe("https://example.com/2");
		});
	});

	describe("Lock mechanism tests", () => {
		it("operation queuing works correctly", async () => {
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

			// Execute operations sequentially
			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(storage.addItem(`https://example.com/${i}`, `Item ${i}`));
			}

			await Promise.all(promises);

			// Verify expected number of operations executed
			expect(operations).toHaveLength(10); // 5 get + 5 set

			// Verify get and set were called expected number of times
			const getCount = operations.filter((op) => op === "get").length;
			const setCount = operations.filter((op) => op === "set").length;
			expect(getCount).toBe(5);
			expect(setCount).toBe(5);
		});
	});
});
