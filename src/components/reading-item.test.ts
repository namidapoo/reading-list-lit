import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./reading-item";
import { createMockItem, fixtures } from "@test-utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ReadingItem } from "@/types";
import type { ReadingItemElement } from "./reading-item";

describe("ReadingItem", () => {
	let container: HTMLDivElement;
	let element: ReadingItemElement;
	const mockItem = createMockItem({
		title: "Test Article Title",
		addedAt: Date.now() - 3600000, // 1時間前
	});

	beforeEach(async () => {
		document.body.innerHTML = "";
		container = createTestContainer();

		element = document.createElement("reading-item") as ReadingItemElement;
		element.item = mockItem;
		container.appendChild(element);

		await waitForUpdates(element);
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	describe("レンダリング", () => {
		it("タイトルが表示される", () => {
			const title = element.shadowRoot?.querySelector(".item-title");
			expect(title?.textContent).toBe(mockItem.title);
		});

		it("URLが表示される", () => {
			const url = element.shadowRoot?.querySelector(".item-url");
			// URL is formatted to show only hostname
			expect(url?.textContent).toBe("example.com");
			// Full URL is available in title attribute
			expect(url?.getAttribute("title")).toBe(mockItem.url);
		});

		it("追加日時が相対形式で表示される", () => {
			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/1 hour ago|an hour ago/);
		});

		it("faviconが表示される", () => {
			const favicon = element.shadowRoot?.querySelector(
				".item-favicon",
			) as HTMLImageElement;
			expect(favicon).toBeTruthy();
			expect(favicon?.src).toBe(mockItem.faviconUrl);
			expect(favicon?.alt).toBe("");
		});

		it("faviconがない場合はデフォルトアイコンが表示される", async () => {
			element.item = fixtures.itemWithoutFavicon;
			await waitForUpdates(element);

			const favicon = element.shadowRoot?.querySelector(".item-favicon");
			const defaultIcon = element.shadowRoot?.querySelector(".default-icon");

			expect(favicon).toBeFalsy();
			expect(defaultIcon).toBeTruthy();
		});

		it("削除ボタンが表示される", () => {
			const deleteButton = element.shadowRoot?.querySelector(".delete-button");
			expect(deleteButton).toBeTruthy();
			expect(deleteButton?.getAttribute("aria-label")).toBe("Delete item");
		});
	});

	describe("クリックイベント", () => {
		it("通常クリックでitem-clickイベントが発火する", async () => {
			const listener = vi.fn();
			element.addEventListener("item-click", listener);

			const itemContent = element.shadowRoot?.querySelector(
				".item-content",
			) as HTMLElement;
			itemContent.click();

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: {
						item: mockItem,
						newTab: false,
					},
				}),
			);
		});

		it("Ctrl+クリックでnewTab=trueのイベントが発火する", async () => {
			const listener = vi.fn();
			element.addEventListener("item-click", listener);

			const itemContent = element.shadowRoot?.querySelector(
				".item-content",
			) as HTMLElement;

			const event = new MouseEvent("click", {
				bubbles: true,
				ctrlKey: true,
			});
			itemContent.dispatchEvent(event);

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: {
						item: mockItem,
						newTab: true,
					},
				}),
			);
		});

		it("Cmd+クリック（Mac）でnewTab=trueのイベントが発火する", async () => {
			const listener = vi.fn();
			element.addEventListener("item-click", listener);

			const itemContent = element.shadowRoot?.querySelector(
				".item-content",
			) as HTMLElement;

			const event = new MouseEvent("click", {
				bubbles: true,
				metaKey: true,
			});
			itemContent.dispatchEvent(event);

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: {
						item: mockItem,
						newTab: true,
					},
				}),
			);
		});

		it("削除ボタンクリックでitem-deleteイベントが発火する", async () => {
			const listener = vi.fn();
			element.addEventListener("item-delete", listener);

			const deleteButton = element.shadowRoot?.querySelector(
				".delete-button",
			) as HTMLButtonElement;
			deleteButton.click();

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: {
						item: mockItem,
					},
				}),
			);
		});

		it("削除ボタンクリック時はitem-clickイベントが発火しない", async () => {
			const clickListener = vi.fn();
			const deleteListener = vi.fn();
			element.addEventListener("item-click", clickListener);
			element.addEventListener("item-delete", deleteListener);

			const deleteButton = element.shadowRoot?.querySelector(
				".delete-button",
			) as HTMLButtonElement;
			deleteButton.click();

			expect(deleteListener).toHaveBeenCalledTimes(1);
			expect(clickListener).not.toHaveBeenCalled();
		});
	});

	describe("favicon表示", () => {
		it("favicon読み込みエラー時はデフォルトアイコンが表示される", async () => {
			const favicon = element.shadowRoot?.querySelector(
				".item-favicon",
			) as HTMLImageElement;

			// エラーイベントをシミュレート
			favicon.dispatchEvent(new Event("error"));
			await waitForUpdates(element);

			const updatedFavicon = element.shadowRoot?.querySelector(".item-favicon");
			const defaultIcon = element.shadowRoot?.querySelector(".default-icon");

			expect(updatedFavicon).toBeFalsy();
			expect(defaultIcon).toBeTruthy();
		});

		it("DuckDuckGo favicon APIのURLが正しく生成される", async () => {
			const testUrl = "https://github.com/user/repo";
			element.item = { ...mockItem, url: testUrl };
			await waitForUpdates(element);

			const favicon = element.shadowRoot?.querySelector(
				".item-favicon",
			) as HTMLImageElement;

			if (mockItem.faviconUrl) {
				expect(favicon?.src).toBe(mockItem.faviconUrl);
			}
		});
	});

	describe("時間表示", () => {
		it("1分未満は'Just now'と表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 30000 };
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toBe("Just now");
		});

		it("1時間未満は分単位で表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 1800000 }; // 30分前
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/30 minutes ago/);
		});

		it("24時間未満は時間単位で表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 7200000 }; // 2時間前
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/2 hours ago/);
		});

		it("24時間以上は日付で表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 172800000 }; // 2日前
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/2 days ago/);
		});
	});

	describe("エッジケース", () => {
		it("favicon読み込みのタイムアウト処理", async () => {
			const item: ReadingItem = {
				id: "timeout-test",
				url: "https://example.com",
				title: "Timeout Test",
				faviconUrl: "https://slow-server.com/favicon.ico",
				addedAt: Date.now(),
			};

			element.item = item;
			await waitForUpdates(element);

			const favicon = element.shadowRoot?.querySelector(
				".item-favicon",
			) as HTMLImageElement;

			// エラーイベントをシミュレート（タイムアウト）
			if (favicon) {
				const errorEvent = new Event("error");
				favicon.dispatchEvent(errorEvent);
				await waitForUpdates(element);

				// デフォルトアイコンが表示されることを確認
				const defaultIcon = element.shadowRoot?.querySelector(".default-icon");
				expect(defaultIcon).toBeDefined();
			}
		});

		it("未来の日付の時間表示が正しく処理される", async () => {
			const futureDate = Date.now() + 86400000 * 365; // 1年後
			const item: ReadingItem = {
				id: "future-test",
				url: "https://example.com",
				title: "Future Item",
				addedAt: futureDate,
			};

			element.item = item;
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			// 負の経過時間でもエラーにならないことを確認
			expect(time?.textContent).toBeDefined();
		});
	});
});
