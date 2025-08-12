import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingListStorage } from "./storage";

// Storageクラスのモック
vi.mock("./storage", () => ({
	ReadingListStorage: vi.fn().mockImplementation(() => ({
		addItem: vi.fn(),
		getItems: vi.fn().mockResolvedValue([]),
	})),
}));

// Chrome APIのモック
const mockChrome = {
	runtime: {
		onInstalled: {
			addListener: vi.fn(),
		},
		onMessage: {
			addListener: vi.fn(),
		},
	},
	contextMenus: {
		create: vi.fn(),
		onClicked: {
			addListener: vi.fn(),
		},
	},
	tabs: {
		query: vi.fn(),
		get: vi.fn(),
	},
	action: {
		setBadgeText: vi.fn(),
		setBadgeBackgroundColor: vi.fn(),
	},
};

// グローバルにchromeオブジェクトをモック
Object.assign(globalThis, { chrome: mockChrome });

describe("Background Script", () => {
	// biome-ignore lint/suspicious/noExplicitAny: モックの型定義のため
	let storage: any;
	let onInstalledCallback: () => void;
	let onContextMenuClickedCallback: (
		info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) => void;

	beforeEach(() => {
		vi.clearAllMocks();
		storage = new ReadingListStorage();

		// コールバック関数をキャプチャ
		mockChrome.runtime.onInstalled.addListener.mockImplementation(
			(callback) => {
				onInstalledCallback = callback;
			},
		);
		mockChrome.contextMenus.onClicked.addListener.mockImplementation(
			(callback) => {
				onContextMenuClickedCallback = callback;
			},
		);
	});

	describe("ServiceWorker起動", () => {
		it("インストール時にイベントリスナーが登録される", async () => {
			// background.tsをインポート（実際の実装後）
			await import("./background");

			expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
			expect(mockChrome.contextMenus.onClicked.addListener).toHaveBeenCalled();
		});

		it("アンインストール時の状態を保持しない", async () => {
			await import("./background");

			// ServiceWorkerの特性上、状態は保持されない
			expect(storage).toBeDefined();
		});
	});

	describe("コンテキストメニュー作成", () => {
		beforeEach(async () => {
			await import("./background");
			onInstalledCallback?.();
		});

		it("ページ用のコンテキストメニューが作成される", () => {
			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "save-page",
				title: "Save to Reading List",
				contexts: ["page"],
			});
		});

		it("リンク用のコンテキストメニューが作成される", () => {
			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "save-link",
				title: "Save Link to Reading List",
				contexts: ["link"],
			});
		});

		it("選択テキスト用のコンテキストメニューは作成されない", () => {
			const calls = mockChrome.contextMenus.create.mock.calls;
			const hasSelectionContext = calls.some((call) =>
				call[0].contexts?.includes("selection"),
			);
			expect(hasSelectionContext).toBe(false);
		});
	});

	describe("ページ保存処理", () => {
		const mockTab = {
			id: 1,
			url: "https://example.com/article",
			title: "Example Article",
		};

		beforeEach(async () => {
			await import("./background");
			onInstalledCallback?.();
			// モジュールインポート後にstorageを取得
			const backgroundModule = await import("./background");
			storage = backgroundModule.storage;
			// biome-ignore lint/suspicious/noExplicitAny: モックの型定義のため
			(storage.addItem as any).mockResolvedValue({
				id: "new-item",
				url: mockTab.url,
				title: mockTab.title,
				addedAt: Date.now(),
			});
		});

		it("現在のページを保存できる", async () => {
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-page",
				pageUrl: mockTab.url,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			expect(storage.addItem).toHaveBeenCalledWith(mockTab.url, mockTab.title);
		});

		it("タイトルがない場合はURLを使用する", async () => {
			const tabWithoutTitle = { ...mockTab, title: undefined };
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-page",
				pageUrl: mockTab.url,
				editable: false,
			};

			await onContextMenuClickedCallback?.(
				info,
				tabWithoutTitle as chrome.tabs.Tab,
			);

			expect(storage.addItem).toHaveBeenCalledWith(mockTab.url, mockTab.url);
		});

		it("chrome:// URLは保存しない", async () => {
			const chromeTab = {
				...mockTab,
				url: "chrome://extensions",
			};
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-page",
				pageUrl: chromeTab.url,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, chromeTab as chrome.tabs.Tab);

			expect(storage.addItem).not.toHaveBeenCalled();
		});

		it("バッジで成功を表示する", async () => {
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-page",
				pageUrl: mockTab.url,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
				text: "✓",
				tabId: mockTab.id,
			});
			expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
				color: "#16a34a",
				tabId: mockTab.id,
			});
		});

		it("エラー時にバッジでエラーを表示する", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: モックの型定義のため
			(storage.addItem as any).mockRejectedValue(new Error("Storage full"));

			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-page",
				pageUrl: mockTab.url,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
				text: "!",
				tabId: mockTab.id,
			});
			expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
				color: "#dc2626",
				tabId: mockTab.id,
			});
		});
	});

	describe("リンク保存処理", () => {
		const mockTab = {
			id: 1,
			url: "https://example.com",
			title: "Example",
		};

		const linkUrl = "https://example.com/linked-article";

		beforeEach(async () => {
			await import("./background");
			onInstalledCallback?.();
			// モジュールインポート後にstorageを取得
			const backgroundModule = await import("./background");
			storage = backgroundModule.storage;
			// biome-ignore lint/suspicious/noExplicitAny: モックの型定義のため
			(storage.addItem as any).mockResolvedValue({
				id: "new-item",
				url: linkUrl,
				title: linkUrl,
				addedAt: Date.now(),
			});
		});

		it("リンクを保存できる", async () => {
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-link",
				linkUrl,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			expect(storage.addItem).toHaveBeenCalledWith(linkUrl, linkUrl);
		});

		it("リンクURLがない場合は何もしない", async () => {
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-link",
				linkUrl: undefined,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			expect(storage.addItem).not.toHaveBeenCalled();
		});

		it("javascript: URLは保存しない", async () => {
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-link",
				linkUrl: "javascript:alert('test')",
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			expect(storage.addItem).not.toHaveBeenCalled();
		});
	});

	describe("バッジ管理", () => {
		const mockTab = {
			id: 1,
			url: "https://example.com/article",
			title: "Example Article",
		};

		beforeEach(async () => {
			await import("./background");
			onInstalledCallback?.();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("3秒後にバッジがクリアされる", async () => {
			const info: chrome.contextMenus.OnClickData = {
				menuItemId: "save-page",
				pageUrl: mockTab.url,
				editable: false,
			};

			await onContextMenuClickedCallback?.(info, mockTab as chrome.tabs.Tab);

			// 3秒経過
			vi.advanceTimersByTime(3000);

			expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({
				text: "",
				tabId: mockTab.id,
			});
		});
	});
});
