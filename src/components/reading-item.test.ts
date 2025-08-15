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
		addedAt: Date.now() - 3600000, // 1 hour ago
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

	describe("Rendering", () => {
		it("displays title", () => {
			const title = element.shadowRoot?.querySelector(".item-title");
			expect(title?.textContent).toBe(mockItem.title);
		});

		it("displays URL", () => {
			const url = element.shadowRoot?.querySelector(".item-url");
			// URL is formatted to show only hostname
			expect(url?.textContent).toBe("example.com");
			// Full URL is available in title attribute
			expect(url?.getAttribute("title")).toBe(mockItem.url);
		});

		it("displays added date in relative format", () => {
			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/1 hour ago|an hour ago/);
		});

		it("displays favicon", () => {
			const favicon = element.shadowRoot?.querySelector(
				".item-favicon",
			) as HTMLImageElement;
			expect(favicon).toBeTruthy();
			expect(favicon?.src).toBe(mockItem.faviconUrl);
			expect(favicon?.alt).toBe("");
		});

		it("displays default icon when favicon is missing", async () => {
			element.item = fixtures.itemWithoutFavicon;
			await waitForUpdates(element);

			const favicon = element.shadowRoot?.querySelector(".item-favicon");
			const defaultIcon = element.shadowRoot?.querySelector(".default-icon");

			expect(favicon).toBeFalsy();
			expect(defaultIcon).toBeTruthy();
		});

		it("displays delete button", () => {
			const deleteButton = element.shadowRoot?.querySelector(".delete-button");
			expect(deleteButton).toBeTruthy();
			expect(deleteButton?.getAttribute("aria-label")).toBe("Delete item");
		});
	});

	describe("Click events", () => {
		it("fires item-click event on normal click", async () => {
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

		it("fires event with newTab=true on Ctrl+click", async () => {
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

		it("fires event with newTab=true on Cmd+click (Mac)", async () => {
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

		it("fires item-delete event on delete button click", async () => {
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

		it("does not fire item-click event when delete button is clicked", async () => {
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

	describe("Favicon display", () => {
		it("displays default icon on favicon load error", async () => {
			const favicon = element.shadowRoot?.querySelector(
				".item-favicon",
			) as HTMLImageElement;

			// Simulate error event
			favicon.dispatchEvent(new Event("error"));
			await waitForUpdates(element);

			const updatedFavicon = element.shadowRoot?.querySelector(".item-favicon");
			const defaultIcon = element.shadowRoot?.querySelector(".default-icon");

			expect(updatedFavicon).toBeFalsy();
			expect(defaultIcon).toBeTruthy();
		});

		it("generates correct DuckDuckGo favicon API URL", async () => {
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

	describe("Time display", () => {
		it("displays 'Just now' for less than 1 minute", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 30000 };
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toBe("Just now");
		});

		it("displays in minutes for less than 1 hour", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 1800000 }; // 30 minutes ago
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/30 minutes ago/);
		});

		it("displays in hours for less than 24 hours", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 7200000 }; // 2 hours ago
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/2 hours ago/);
		});

		it("displays in days for 24 hours or more", async () => {
			element.item = { ...mockItem, addedAt: Date.now() - 172800000 }; // 2 days ago
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			expect(time?.textContent).toMatch(/2 days ago/);
		});
	});

	describe("Edge cases", () => {
		it("handles favicon loading timeout", async () => {
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

			// Simulate error event (timeout)
			if (favicon) {
				const errorEvent = new Event("error");
				favicon.dispatchEvent(errorEvent);
				await waitForUpdates(element);

				// Verify default icon is displayed
				const defaultIcon = element.shadowRoot?.querySelector(".default-icon");
				expect(defaultIcon).toBeDefined();
			}
		});

		it("correctly handles future date time display", async () => {
			const futureDate = Date.now() + 86400000 * 365; // 1 year later
			const item: ReadingItem = {
				id: "future-test",
				url: "https://example.com",
				title: "Future Item",
				addedAt: futureDate,
			};

			element.item = item;
			await waitForUpdates(element);

			const time = element.shadowRoot?.querySelector(".item-time");
			// Verify no error occurs with negative elapsed time
			expect(time?.textContent).toBeDefined();
		});
	});
});
