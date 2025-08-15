import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./item-list";
import "./reading-item";
import { createMockItems } from "@test-utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ReadingItem } from "@/types";
import type { ItemList } from "./item-list";

describe("ItemList", () => {
	let container: HTMLDivElement;
	let itemList: ItemList;

	const mockItems = createMockItems(3, {
		title: "Article",
	});

	beforeEach(async () => {
		document.body.innerHTML = "";
		container = createTestContainer();

		itemList = document.createElement("item-list") as ItemList;
		container.appendChild(itemList);

		await waitForUpdates(itemList);
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	describe("Empty state", () => {
		it("shows empty state message when no items", async () => {
			itemList.items = [];
			await waitForUpdates(itemList);

			const emptyMessage = itemList.shadowRoot?.querySelector(".empty-state");
			expect(emptyMessage).toBeTruthy();
			expect(emptyMessage?.textContent).toContain("No items");
		});
	});

	describe("Item display", () => {
		it("displays multiple items", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			expect(items?.length).toBe(3);
		});

		it("passes correct data to each item", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			items?.forEach((item, index) => {
				const readingItem = item as HTMLElement & { item: ReadingItem };
				expect(readingItem.item).toEqual(mockItems[index]);
			});
		});

		it("can display loading state", async () => {
			itemList.loading = true;
			await waitForUpdates(itemList);

			const loader = itemList.shadowRoot?.querySelector(".loading-state");
			expect(loader).toBeTruthy();
		});

		it("does not display items while loading", async () => {
			itemList.items = mockItems;
			itemList.loading = true;
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			const loader = itemList.shadowRoot?.querySelector(".loading-state");

			expect(items?.length).toBe(0);
			expect(loader).toBeTruthy();
		});
	});

	describe("Event propagation", () => {
		it("propagates item click event", async () => {
			const listener = vi.fn();
			itemList.addEventListener("item-click", listener);

			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const firstItem = itemList.shadowRoot?.querySelector("reading-item");
			// Add composed: true to propagate across Shadow DOM
			firstItem?.dispatchEvent(
				new CustomEvent("item-click", {
					detail: { item: mockItems[0], newTab: false },
					bubbles: true,
					composed: true,
				}),
			);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { item: mockItems[0], newTab: false },
				}),
			);
		});

		it("propagates delete event", async () => {
			const listener = vi.fn();
			itemList.addEventListener("item-delete", listener);

			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const secondItem =
				itemList.shadowRoot?.querySelectorAll("reading-item")[1];
			// Add composed: true to propagate across Shadow DOM
			secondItem?.dispatchEvent(
				new CustomEvent("item-delete", {
					detail: { item: mockItems[1] },
					bubbles: true,
					composed: true,
				}),
			);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { item: mockItems[1] },
				}),
			);
		});
	});

	describe("Error state", () => {
		it("can display error message", async () => {
			itemList.error = "Failed to load items";
			await waitForUpdates(itemList);

			const errorMessage = itemList.shadowRoot?.querySelector(".error-state");
			expect(errorMessage).toBeTruthy();
			expect(errorMessage?.textContent).toContain("Failed to load items");
		});

		it("does not display items when error occurs", async () => {
			itemList.items = mockItems;
			itemList.error = "Error occurred";
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			const errorMessage = itemList.shadowRoot?.querySelector(".error-state");

			expect(items?.length).toBe(0);
			expect(errorMessage).toBeTruthy();
		});
	});

	describe("Accessibility", () => {
		it("has live region for screen readers when loading", async () => {
			itemList.loading = true;
			await waitForUpdates(itemList);

			const liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion).toBeTruthy();
			expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
			expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
			expect(liveRegion?.textContent?.trim()).toBe("Loading items...");
		});

		it("has live region for screen readers when displaying items", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion).toBeTruthy();
			expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
			expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
			expect(liveRegion?.textContent?.trim()).toBe("3 items loaded");
		});

		it("applies sr-only class to live region", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.classList.contains("sr-only")).toBe(true);
		});

		it("displays singular and plural forms correctly", async () => {
			// 0 items (plural)
			itemList.items = [];
			await waitForUpdates(itemList);
			let liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("0 items loaded");

			// 1 item (singular)
			itemList.items = [mockItems[0]];
			await waitForUpdates(itemList);
			liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("1 item loaded");

			// 2 or more items (plural)
			itemList.items = [mockItems[0], mockItems[1]];
			await waitForUpdates(itemList);
			liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("2 items loaded");
		});

		it("updates live region when item count changes", async () => {
			itemList.items = [mockItems[0]];
			await waitForUpdates(itemList);

			let liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("1 item loaded");

			itemList.items = mockItems;
			await waitForUpdates(itemList);

			liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("3 items loaded");
		});
	});
});
