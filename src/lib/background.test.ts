import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundService } from "./background-service";

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

Object.assign(globalThis, { chrome: mockChrome });

describe("BackgroundService", () => {
	let service: BackgroundService;

	beforeEach(() => {
		service = new BackgroundService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe("初期化", () => {
		it("コンテキストメニューが作成される", async () => {
			await service.initialize();

			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "save-page",
				title: "Save to Reading List",
				contexts: ["page"],
			});
			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "save-link",
				title: "Save Link to Reading List",
				contexts: ["link"],
			});
		});
	});

	describe("コンテキストメニュー処理", () => {
		it("ページ保存: 有効なURLの場合、ストレージに追加される", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com",
				title: "Example Site",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-page",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi.fn().mockResolvedValue({ id: "new-item" });

			await service.handleContextMenuClick(mockInfo, mockTab);

			expect(mockStorage.addItem).toHaveBeenCalledWith(
				"https://example.com",
				"Example Site",
			);
			expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
				text: "✓",
				tabId: 1,
			});
		});

		it("リンク保存: 有効なURLの場合、ストレージに追加される", async () => {
			const mockTab = {
				id: 1,
				url: "https://current-page.com",
				title: "Current Page",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-link",
				linkUrl: "https://linked-page.com",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi.fn().mockResolvedValue({ id: "new-item" });

			await service.handleContextMenuClick(mockInfo, mockTab);

			expect(mockStorage.addItem).toHaveBeenCalledWith(
				"https://linked-page.com",
				"https://linked-page.com",
			);
			expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
				text: "✓",
				tabId: 1,
			});
		});

		it("内部URL（chrome://）は保存されない", async () => {
			const mockTab = {
				id: 1,
				url: "chrome://extensions",
				title: "Extensions",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-page",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi.fn();

			await service.handleContextMenuClick(mockInfo, mockTab);

			expect(mockStorage.addItem).not.toHaveBeenCalled();
			expect(mockChrome.action.setBadgeText).not.toHaveBeenCalled();
		});

		it("危険なURL（javascript:）は保存されない", async () => {
			const mockTab = {
				id: 1,
				url: "https://current-page.com",
				title: "Current Page",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-link",
				linkUrl: "javascript:alert('test')",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi.fn();

			await service.handleContextMenuClick(mockInfo, mockTab);

			expect(mockStorage.addItem).not.toHaveBeenCalled();
		});

		it("ストレージエラー時にエラーバッジが表示される", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com",
				title: "Example Site",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-page",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi
				.fn()
				.mockRejectedValue(new Error("Storage error"));

			await service.handleContextMenuClick(mockInfo, mockTab);

			expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
				text: "!",
				tabId: 1,
			});
			expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
				color: "#dc2626",
				tabId: 1,
			});
		});
	});

	describe("バッジ処理", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("成功バッジが3秒後にクリアされる", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com",
				title: "Example Site",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-page",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi.fn().mockResolvedValue({ id: "new-item" });

			await service.handleContextMenuClick(mockInfo, mockTab);

			// 3秒経過
			vi.advanceTimersByTime(3000);

			expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({
				text: "",
				tabId: 1,
			});
		});

		it("エラーバッジが3秒後にクリアされる", async () => {
			const mockTab = {
				id: 1,
				url: "https://example.com",
				title: "Example Site",
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
			} as chrome.tabs.Tab;

			const mockInfo = {
				menuItemId: "save-page",
				editable: false,
			} as chrome.contextMenus.OnClickData;

			const mockStorage = service.getStorage();
			mockStorage.addItem = vi
				.fn()
				.mockRejectedValue(new Error("Storage error"));

			await service.handleContextMenuClick(mockInfo, mockTab);

			// 3秒経過
			vi.advanceTimersByTime(3000);

			expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({
				text: "",
				tabId: 1,
			});
		});
	});

	describe("メッセージハンドリング", () => {
		it("メッセージハンドラーがtrueを返す", () => {
			const result = service.handleMessage(
				{ type: "test" },
				{} as chrome.runtime.MessageSender,
				vi.fn(),
			);

			expect(result).toBe(true);
		});
	});
});
