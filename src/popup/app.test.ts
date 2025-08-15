import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@components/search-box";
import "@components/item-list";
import type { ItemList } from "@components/item-list";
import "./app";
import { createMockItems } from "@test-utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ReadingListPopup } from "./app";

// Mock Storage class
vi.mock("@lib/storage", () => {
	return {
		ReadingListStorage: vi.fn().mockImplementation(() => ({
			getItems: vi.fn().mockResolvedValue([]),
			searchItems: vi.fn().mockResolvedValue([]),
			addItem: vi.fn(),
			removeItem: vi.fn(),
			getItemCount: vi.fn().mockResolvedValue(0),
			cleanup: vi.fn(),
		})),
	};
});

// Chrome API mock
const mockChrome = {
	tabs: {
		query: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	storage: {
		sync: {
			onChanged: {
				addListener: vi.fn(),
				removeListener: vi.fn(),
			},
		},
	},
};

Object.assign(globalThis, { chrome: mockChrome });

describe("ReadingListPopup", () => {
	let container: HTMLDivElement;
	let popup: ReadingListPopup;

	const mockItems = createMockItems(2, {
		faviconUrl: "https://example.com/favicon.ico",
	});

	beforeEach(async () => {
		document.body.innerHTML = "";
		container = createTestContainer();

		popup = document.createElement("reading-list-popup") as ReadingListPopup;
		container.appendChild(popup);

		await waitForUpdates(popup);
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanupTestContainer(container);
	});

	describe("Header display", () => {
		it("displays title", () => {
			const title = popup.shadowRoot?.querySelector(".header-title");
			expect(title?.textContent).toBe("Reading List");
		});

		it("displays item count", async () => {
			popup.storage.getItemCount = vi.fn().mockResolvedValue(5);
			await popup.loadItems();
			await popup.updateComplete;

			const count = popup.shadowRoot?.querySelector(".item-count");
			expect(count?.textContent?.trim()).toBe("5 items");
		});

		it("displays add button", () => {
			const addButton = popup.shadowRoot?.querySelector(".add-button");
			expect(addButton).toBeTruthy();
			expect(addButton?.getAttribute("aria-label")).toBe("Add current page");
		});
	});

	describe('"+" button click', () => {
		it("adds current tab to reading list", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com/article",
				title: "Test Article",
			};

			mockChrome.tabs.query.mockResolvedValue([mockTab]);
			popup.storage.addItem = vi.fn().mockResolvedValue({
				id: "new-id",
				url: mockTab.url,
				title: mockTab.title,
				addedAt: Date.now(),
			});

			const addButton = popup.shadowRoot?.querySelector(
				".add-button",
			) as HTMLButtonElement;
			addButton.click();

			await vi.waitFor(() => {
				expect(mockChrome.tabs.query).toHaveBeenCalledWith({
					active: true,
					currentWindow: true,
				});
			});

			await vi.waitFor(() => {
				expect(popup.storage.addItem).toHaveBeenCalledWith(
					mockTab.url,
					mockTab.title,
				);
			});
		});

		it("does not add chrome:// URLs", async () => {
			const mockTab = {
				id: 1,
				url: "chrome://extensions",
				title: "Extensions",
			};

			mockChrome.tabs.query.mockResolvedValue([mockTab]);

			const addButton = popup.shadowRoot?.querySelector(
				".add-button",
			) as HTMLButtonElement;
			addButton.click();

			await vi.waitFor(
				() => {
					// Verify addItem was not called
					expect(popup.storage.addItem).not.toHaveBeenCalled();
				},
				{ timeout: 150 },
			);
		});

		it("displays loading state while adding", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com/article",
				title: "Test Article",
			};

			mockChrome.tabs.query.mockResolvedValue([mockTab]);

			// Add delay to verify loading state
			popup.storage.addItem = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve({
									id: "new-id",
									url: mockTab.url,
									title: mockTab.title,
									addedAt: Date.now(),
								}),
							100,
						),
					),
			);

			const addButton = popup.shadowRoot?.querySelector(
				".add-button",
			) as HTMLButtonElement;
			addButton.click();

			await popup.updateComplete;

			expect(addButton.disabled).toBe(true);
			expect(addButton.classList.contains("loading")).toBe(true);
		});
	});

	describe("Search integration", () => {
		it("displays search box", () => {
			const searchBox = popup.shadowRoot?.querySelector("search-box");
			expect(searchBox).toBeTruthy();
		});

		it("filters items by search input", async () => {
			popup.storage.searchItems = vi.fn().mockResolvedValue([mockItems[0]]);

			const searchBox = popup.shadowRoot?.querySelector("search-box");
			searchBox?.dispatchEvent(
				new CustomEvent("search-changed", {
					detail: { value: "First" },
					bubbles: true,
				}),
			);

			await vi.waitFor(() => {
				expect(popup.storage.searchItems).toHaveBeenCalledWith("First");
			});

			await popup.updateComplete;

			const itemList = popup.shadowRoot?.querySelector("item-list") as ItemList;
			expect(itemList.items.length).toBe(1);
			expect(itemList.items[0]).toEqual(mockItems[0]);
		});

		it("displays all items with empty search query", async () => {
			popup.storage.getItems = vi.fn().mockResolvedValue(mockItems);

			const searchBox = popup.shadowRoot?.querySelector("search-box");
			searchBox?.dispatchEvent(
				new CustomEvent("search-changed", {
					detail: { value: "" },
					bubbles: true,
				}),
			);

			await vi.waitFor(() => {
				expect(popup.storage.getItems).toHaveBeenCalled();
			});

			await popup.updateComplete;

			const itemList = popup.shadowRoot?.querySelector("item-list") as ItemList;
			expect(itemList.items.length).toBe(2);
		});
	});

	describe("Item operations", () => {
		it("opens new tab on item click", async () => {
			const itemList = popup.shadowRoot?.querySelector("item-list");
			itemList?.dispatchEvent(
				new CustomEvent("item-click", {
					detail: {
						item: mockItems[0],
						newTab: false,
					},
					bubbles: true,
				}),
			);

			await vi.waitFor(() => {
				expect(mockChrome.tabs.update).toHaveBeenCalledWith({
					url: mockItems[0].url,
				});
			});
		});

		it("opens new tab with Ctrl/Cmd+click", async () => {
			const itemList = popup.shadowRoot?.querySelector("item-list");
			itemList?.dispatchEvent(
				new CustomEvent("item-click", {
					detail: {
						item: mockItems[0],
						newTab: true,
					},
					bubbles: true,
				}),
			);

			await vi.waitFor(() => {
				expect(mockChrome.tabs.create).toHaveBeenCalledWith({
					url: mockItems[0].url,
					active: false,
				});
			});
		});

		it("removes item from storage on delete", async () => {
			popup.storage.removeItem = vi.fn().mockResolvedValue(undefined);
			popup.storage.getItems = vi.fn().mockResolvedValue([mockItems[1]]);

			const itemList = popup.shadowRoot?.querySelector("item-list");
			itemList?.dispatchEvent(
				new CustomEvent("item-delete", {
					detail: {
						item: mockItems[0],
					},
					bubbles: true,
				}),
			);

			await vi.waitFor(() => {
				expect(popup.storage.removeItem).toHaveBeenCalledWith(mockItems[0].id);
			});

			await vi.waitFor(() => {
				expect(popup.storage.getItems).toHaveBeenCalled();
			});
		});
	});

	describe("Loading state", () => {
		it("displays loading on initial load", async () => {
			// Create new popup instance (before loadItems is called)
			const newPopup = document.createElement(
				"reading-list-popup",
			) as ReadingListPopup;
			// Mock loadItems with delay
			newPopup.storage.getItems = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
				);
			container.appendChild(newPopup);
			await newPopup.updateComplete;

			// Verify state right after connectedCallback is called
			const itemList = newPopup.shadowRoot?.querySelector(
				"item-list",
			) as ItemList;
			expect(itemList.loading).toBe(true);
		});

		it("hides loading after data load completes", async () => {
			popup.storage.getItems = vi.fn().mockResolvedValue(mockItems);
			await popup.loadItems();
			await popup.updateComplete;

			const itemList = popup.shadowRoot?.querySelector("item-list") as ItemList;
			expect(itemList.loading).toBe(false);
			expect(itemList.items).toEqual(mockItems);
		});
	});

	describe("Storage change listener", () => {
		it("removes listener in disconnectedCallback", () => {
			// Create mock for chrome.storage.sync.onChanged.addListener
			const addListenerSpy = vi.fn();
			mockChrome.storage.sync.onChanged.addListener = addListenerSpy;

			// Create mock for chrome.storage.sync.onChanged.removeListener
			const removeListenerSpy = vi.fn();
			mockChrome.storage.sync.onChanged.removeListener = removeListenerSpy;

			// Create new popup instance (connectedCallback is called)
			const testPopup = document.createElement(
				"reading-list-popup",
			) as ReadingListPopup;
			container.appendChild(testPopup);

			// Verify listener was added
			expect(addListenerSpy).toHaveBeenCalled();
			const addedListener = addListenerSpy.mock.calls[0][0];
			expect(addedListener).toBeDefined();

			// Call disconnectedCallback
			testPopup.disconnectedCallback();

			// Verify listener was removed
			expect(removeListenerSpy).toHaveBeenCalledWith(addedListener);
		});
	});

	describe("Multiple items display", () => {
		it('displays "0 items" when 0 items', async () => {
			popup.storage.getItemCount = vi.fn().mockResolvedValue(0);
			await popup.loadItems();
			await popup.updateComplete;

			const count = popup.shadowRoot?.querySelector(".item-count");
			expect(count?.textContent?.trim()).toBe("0 items");
		});

		it('displays "1 item" when 1 item', async () => {
			popup.storage.getItemCount = vi.fn().mockResolvedValue(1);
			await popup.loadItems();
			await popup.updateComplete;

			const count = popup.shadowRoot?.querySelector(".item-count");
			expect(count?.textContent?.trim()).toBe("1 item");
		});

		it('displays "N items" when 2 or more items', async () => {
			popup.storage.getItemCount = vi.fn().mockResolvedValue(5);
			await popup.loadItems();
			await popup.updateComplete;

			const count = popup.shadowRoot?.querySelector(".item-count");
			expect(count?.textContent?.trim()).toBe("5 items");
		});
	});
});
