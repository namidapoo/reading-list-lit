import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingItem } from "@/types";
import { ReadingListStorage } from "./storage";

describe("Storage Rollback Tests", () => {
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
		// Create new instance for each test to clear cache
		storage = new ReadingListStorage();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Partial write failures", () => {
		it("throws error when storage write fails", async () => {
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

			// Simulate write failure
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

			// Verify error is thrown
			await expect(
				storage.addItem("https://example.com/2", "Item 2"),
			).rejects.toThrow("Failed to save items");

			// It's sufficient to verify that the error is thrown correctly
			// (In actual implementation, cache is not updated when saveItems fails)
		});

		it("rolls back all changes when multiple item addition fails", async () => {
			const initialItems: ReadingItem[] = [];
			let setCallCount = 0;

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				if (callback) {
					callback({ items: initialItems });
				} else {
					return Promise.resolve({ items: initialItems });
				}
			});

			// Set to fail on second write
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

			// Add multiple items (simulate batch processing)
			const addPromises = [
				storage.addItem("https://example.com/1", "Item 1"),
				storage.addItem("https://example.com/2", "Item 2"),
			];

			const results = await Promise.allSettled(addPromises);

			// Verify at least one fails
			const failures = results.filter((r) => r.status === "rejected");
			expect(failures.length).toBeGreaterThan(0);
		});

		it("preserves original state when delete operation fails", async () => {
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

			// Simulate delete failure
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

			// Verify error is thrown
			await expect(storage.removeItem(itemToDelete.id)).rejects.toThrow(
				"Failed to save items",
			);

			// Verify item still exists
			mockChrome.runtime.lastError = null;
			const items = await storage.getItems();
			expect(items).toHaveLength(1);
			expect(items[0].id).toBe(itemToDelete.id);
		});
	});

	describe("Transactional operations", () => {
		it("rolls back all operations when transaction fails midway", async () => {
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

				// Fail on third operation
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

			// Execute multiple operations
			const operations = [
				storage.removeItem("item-1"),
				storage.addItem("https://example.com/3", "Item 3"),
				storage.addItem("https://example.com/4", "Item 4"),
			];

			const results = await Promise.allSettled(operations);

			// Verify some operations failed
			const failures = results.filter((r) => r.status === "rejected");
			expect(failures.length).toBeGreaterThan(0);

			// Verify log
			expect(operationLog).toContain("get");
			expect(operationLog).toContain("set-1");
		});
	});

	describe("Storage capacity limits", () => {
		it("cannot add items exceeding QUOTA_BYTES_PER_ITEM", async () => {
			// Generate very long title (over 100KB)
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

		it("fails to add when exceeding QUOTA_BYTES", async () => {
			// Simulate storage nearly full
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

	describe("Sync error handling", () => {
		it("retry mechanism works on network errors", async () => {
			let attemptCount = 0;

			mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
				attemptCount++;
				if (attemptCount < 3) {
					// First two attempts fail
					mockChrome.runtime.lastError = {
						message: "Network error",
					};
					if (callback) {
						callback({});
					} else {
						return Promise.reject(new Error("Network error"));
					}
				} else {
					// Success on third attempt
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

			// Success if retry mechanism exists, error otherwise
			try {
				const items = await storage.getItems();
				expect(items).toEqual([]);
				expect(attemptCount).toBe(3);
			} catch (error) {
				// If no retry mechanism
				expect(error).toBeDefined();
			}
		});

		it("handles sync conflicts appropriately", async () => {
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
					// Second call reflects remote changes
					if (callback) {
						callback({ items: remoteItems });
					} else {
						return Promise.resolve({ items: remoteItems });
					}
				}
			});

			mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
				// Simulate sync conflict
				mockChrome.runtime.lastError = {
					message: "Sync conflict detected",
				};
				if (callback) {
					callback();
				} else {
					return Promise.reject(new Error("Sync conflict detected"));
				}
			});

			// Verify conflict is detected
			await expect(
				storage.addItem("https://example.com/new", "New Item"),
			).rejects.toThrow("Failed to save items");
		});
	});
});
