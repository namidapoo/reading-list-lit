import { vi } from "vitest";
import type { ReadingItem } from "@/types";

/**
 * DOMテスト用のコンテナ要素を作成
 */
export function createTestContainer(): HTMLDivElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	return container;
}

/**
 * テストコンテナをクリーンアップ
 */
export function cleanupTestContainer(container: HTMLElement): void {
	if (container.parentNode) {
		container.parentNode.removeChild(container);
	}
}

/**
 * Chrome Storage APIのモックを作成
 */
export function createChromeStorageMock() {
	return {
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
			lastError: null as { message: string } | null,
		},
		tabs: {
			query: vi.fn(),
		},
		action: {
			setBadgeText: vi.fn(),
			setBadgeBackgroundColor: vi.fn(),
		},
		contextMenus: {
			create: vi.fn(),
			removeAll: vi.fn(),
			onClicked: {
				addListener: vi.fn(),
			},
		},
	};
}

/**
 * デフォルトのChrome Storage応答をセットアップ
 */
export function setupDefaultChromeStorageResponses(
	mockChrome: ReturnType<typeof createChromeStorageMock>,
	items: ReadingItem[] = [],
) {
	mockChrome.storage.sync.get.mockImplementation((_key, callback) => {
		if (callback) {
			callback({ items });
		} else {
			return Promise.resolve({ items });
		}
	});

	mockChrome.storage.sync.set.mockImplementation((_data, callback) => {
		if (callback) {
			callback();
		} else {
			return Promise.resolve();
		}
	});

	mockChrome.storage.sync.remove.mockImplementation((_key, callback) => {
		if (callback) {
			callback();
		} else {
			return Promise.resolve();
		}
	});
}

/**
 * 非同期更新を待つヘルパー
 */
export async function waitForUpdates(
	element?: { updateComplete: Promise<unknown> },
	delay = 0,
): Promise<void> {
	if (element?.updateComplete) {
		await element.updateComplete;
	}
	if (delay > 0) {
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
}

/**
 * デバウンス処理を待つヘルパー
 */
export async function waitForDebounce(ms = 150): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * エラーイベントをシミュレート
 */
export function simulateError(element: HTMLElement, message = "Test error") {
	const errorEvent = new CustomEvent("error", {
		detail: { message },
		bubbles: true,
	});
	element.dispatchEvent(errorEvent);
}

/**
 * カスタムイベントの発火を待つ
 */
export function waitForEvent<T = unknown>(
	element: EventTarget,
	eventName: string,
	timeout = 1000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timeout waiting for event: ${eventName}`));
		}, timeout);

		const handler = (event: Event) => {
			clearTimeout(timer);
			element.removeEventListener(eventName, handler);
			resolve((event as CustomEvent<T>).detail);
		};

		element.addEventListener(eventName, handler);
	});
}

/**
 * 完全なChrome APIモックを作成
 */
export function createFullChromeMock() {
	return {
		storage: {
			sync: {
				get: vi.fn(),
				set: vi.fn(),
				remove: vi.fn(),
				clear: vi.fn(),
				getBytesInUse: vi.fn(),
				onChanged: {
					addListener: vi.fn(),
					removeListener: vi.fn(),
				},
			},
			local: {
				get: vi.fn(),
				set: vi.fn(),
				remove: vi.fn(),
				clear: vi.fn(),
			},
		},
		tabs: {
			query: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			get: vi.fn(),
		},
		runtime: {
			lastError: null as { message: string } | null,
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
		contextMenus: {
			create: vi.fn(),
			removeAll: vi.fn(),
			onClicked: {
				addListener: vi.fn(),
			},
		},
	};
}

/**
 * ReadingListStorageクラスのモックを作成
 */
export function createStorageMock(defaultItems: ReadingItem[] = []) {
	return {
		getItems: vi.fn().mockResolvedValue(defaultItems),
		searchItems: vi.fn().mockResolvedValue(defaultItems),
		addItem: vi.fn(),
		removeItem: vi.fn(),
		updateItem: vi.fn(),
		getItemCount: vi.fn().mockResolvedValue(defaultItems.length),
		cleanup: vi.fn(),
		STORAGE_KEY: "items",
		MAX_BYTES: 8192,
	};
}

/**
 * BackgroundServiceのモックを作成
 */
export function createBackgroundServiceMock() {
	return {
		initialize: vi.fn().mockResolvedValue(undefined),
		handleContextMenuClick: vi.fn(),
		updateBadge: vi.fn().mockResolvedValue(undefined),
		handleMessage: vi.fn(),
	};
}

/**
 * Chrome APIをグローバルに設定
 */
export function setupGlobalChrome(
	mockChrome?: ReturnType<typeof createFullChromeMock>,
) {
	const chrome = mockChrome || createFullChromeMock();
	Object.assign(globalThis, { chrome });
	return chrome;
}
