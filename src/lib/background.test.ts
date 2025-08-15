import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundService } from "./background-service";

// Storage class mock
vi.mock("./storage", () => ({
	ReadingListStorage: vi.fn().mockImplementation(() => ({
		addItem: vi.fn(),
		getItems: vi.fn().mockResolvedValue([]),
	})),
}));

// Chrome API mock
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

	describe("Initialization", () => {
		it("creates context menus", async () => {
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

	describe("Context menu handling", () => {
		it("Page save: adds to storage for valid URLs", async () => {
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

		it("Link save: adds to storage for valid URLs", async () => {
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

		it("does not save internal URLs (chrome://)", async () => {
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

		it("does not save dangerous URLs (javascript:)", async () => {
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

		it("displays error badge on storage error", async () => {
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

	describe("Badge handling", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("clears success badge after 3 seconds", async () => {
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

			// 3 seconds pass
			vi.advanceTimersByTime(3000);

			expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({
				text: "",
				tabId: 1,
			});
		});

		it("clears error badge after 3 seconds", async () => {
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

			// 3 seconds pass
			vi.advanceTimersByTime(3000);

			expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({
				text: "",
				tabId: 1,
			});
		});
	});

	describe("Message handling", () => {
		it("message handler returns true", () => {
			const result = service.handleMessage(
				{ type: "test" },
				{} as chrome.runtime.MessageSender,
				vi.fn(),
			);

			expect(result).toBe(true);
		});
	});
});
