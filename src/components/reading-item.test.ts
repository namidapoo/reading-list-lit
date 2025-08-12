import { beforeEach, describe, expect, it, vi } from "vitest";
import "./reading-item";
import type { ReadingItem } from "../types";
import type { ReadingItemElement } from "./reading-item";

describe("ReadingItem", () => {
	let container: HTMLElement;
	let element: ReadingItemElement;
	const mockItem: ReadingItem = {
		id: "test-id",
		url: "https://example.com/article",
		title: "Test Article Title",
		faviconUrl: "https://example.com/favicon.ico",
		addedAt: Date.now() - 3600000, // 1時間前
	};

	beforeEach(async () => {
		document.body.innerHTML = "";
		container = document.createElement("div");
		document.body.appendChild(container);

		element = document.createElement("reading-item") as ReadingItemElement;
		element.item = mockItem;
		container.appendChild(element);

		await element.updateComplete;
	});

	describe("レンダリング", () => {
		it("タイトルが表示される", () => {
			const title = element.shadowRoot?.querySelector(".item-title");
			expect(title?.textContent).toBe(mockItem.title);
		});

		it("URLが表示される", () => {
			const url = element.shadowRoot?.querySelector(".item-url");
			expect(url?.textContent).toBe(mockItem.url);
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
			const itemWithoutFavicon = { ...mockItem, faviconUrl: undefined };
			element.item = itemWithoutFavicon;
			await element.updateComplete;

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

		it("長いタイトルは省略される", async () => {
			const longTitle = "a".repeat(200);
			element.item = { ...mockItem, title: longTitle };
			await element.updateComplete;

			const title = element.shadowRoot?.querySelector(
				".item-title",
			) as HTMLElement;
			const styles = getComputedStyle(title);
			expect(styles.overflow).toBe("hidden");
			expect(styles.textOverflow).toBe("ellipsis");
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
			await element.updateComplete;

			const updatedFavicon = element.shadowRoot?.querySelector(".item-favicon");
			const defaultIcon = element.shadowRoot?.querySelector(".default-icon");

			expect(updatedFavicon).toBeFalsy();
			expect(defaultIcon).toBeTruthy();
		});

		it("DuckDuckGo favicon APIのURLが正しく生成される", async () => {
			const testUrl = "https://github.com/user/repo";
			element.item = { ...mockItem, url: testUrl };
			await element.updateComplete;

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
			await element.updateComplete;

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toBe("Just now");
		});

		it("1時間未満は分単位で表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 1800000 }; // 30分前
			await element.updateComplete;

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/30 minutes ago/);
		});

		it("24時間未満は時間単位で表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 7200000 }; // 2時間前
			await element.updateComplete;

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/2 hours ago/);
		});

		it("24時間以上は日付で表示される", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 172800000 }; // 2日前
			await element.updateComplete;

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/2 days ago/);
		});
	});
});
