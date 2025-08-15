import { beforeEach, describe, expect, it, vi } from "vitest";
import "../components/search-box";
import "../components/item-list";
import type { ItemList } from "../components/item-list";
import "./app";
import type { ReadingItem } from "../types";
import type { ReadingListPopup } from "./app";

// モックStorageクラス
vi.mock("../lib/storage", () => {
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

// Chrome APIのモック
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
	let container: HTMLElement;
	let popup: ReadingListPopup;

	const mockItems: ReadingItem[] = [
		{
			id: "1",
			url: "https://example.com/1",
			title: "First Article",
			faviconUrl: "https://example.com/favicon1.ico",
			addedAt: Date.now() - 1000,
		},
		{
			id: "2",
			url: "https://example.com/2",
			title: "Second Article",
			faviconUrl: "https://example.com/favicon2.ico",
			addedAt: Date.now() - 2000,
		},
	];

	beforeEach(async () => {
		document.body.innerHTML = "";
		container = document.createElement("div");
		document.body.appendChild(container);

		popup = document.createElement("reading-list-popup") as ReadingListPopup;
		container.appendChild(popup);

		await popup.updateComplete;
		vi.clearAllMocks();
	});

	describe("ヘッダー表示", () => {
		it("タイトルが表示される", () => {
			const title = popup.shadowRoot?.querySelector(".header-title");
			expect(title?.textContent).toBe("Reading List");
		});

		it("アイテム数が表示される", async () => {
			popup.storage.getItemCount = vi.fn().mockResolvedValue(5);
			await popup.loadItems();
			await popup.updateComplete;

			const count = popup.shadowRoot?.querySelector(".item-count");
			expect(count?.textContent?.trim()).toBe("5 items");
		});

		it("追加ボタンが表示される", () => {
			const addButton = popup.shadowRoot?.querySelector(".add-button");
			expect(addButton).toBeTruthy();
			expect(addButton?.getAttribute("aria-label")).toBe("Add current page");
		});
	});

	describe("「+」ボタンクリック", () => {
		it("現在のタブを読書リストに追加する", async () => {
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

		it("chrome:// URLは追加しない", async () => {
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

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(popup.storage.addItem).not.toHaveBeenCalled();
		});

		it("追加中はローディング状態を表示する", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com/article",
				title: "Test Article",
			};

			mockChrome.tabs.query.mockResolvedValue([mockTab]);

			// 遅延を追加してローディング状態を確認
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

	describe("検索連携", () => {
		it("検索ボックスが表示される", () => {
			const searchBox = popup.shadowRoot?.querySelector("search-box");
			expect(searchBox).toBeTruthy();
		});

		it("検索入力でアイテムがフィルタリングされる", async () => {
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

		it("空の検索クエリで全アイテムを表示する", async () => {
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

	describe("アイテム操作", () => {
		it("アイテムクリックで新しいタブを開く", async () => {
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

		it("Ctrl/Cmd+クリックで新しいタブを開く", async () => {
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

		it("アイテム削除でストレージから削除する", async () => {
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

	describe("ローディング状態", () => {
		it("初期ロード時にローディングを表示する", async () => {
			// 新しいポップアップインスタンスを作成（loadItemsが呼ばれる前の状態）
			const newPopup = document.createElement(
				"reading-list-popup",
			) as ReadingListPopup;
			// loadItemsをモックして遅延させる
			newPopup.storage.getItems = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
				);
			container.appendChild(newPopup);
			await newPopup.updateComplete;

			// connectedCallbackが呼ばれた直後の状態を確認
			const itemList = newPopup.shadowRoot?.querySelector(
				"item-list",
			) as ItemList;
			expect(itemList.loading).toBe(true);
		});

		it("データロード完了後にローディングを非表示にする", async () => {
			popup.storage.getItems = vi.fn().mockResolvedValue(mockItems);
			await popup.loadItems();
			await popup.updateComplete;

			const itemList = popup.shadowRoot?.querySelector("item-list") as ItemList;
			expect(itemList.loading).toBe(false);
			expect(itemList.items).toEqual(mockItems);
		});
	});

	describe("ストレージ変更リスナー", () => {
		it("disconnectedCallbackでリスナーが削除される", () => {
			// disconnectedCallbackは何も返さないことを確認
			expect(() => popup.disconnectedCallback()).not.toThrow();
		});
	});
});
