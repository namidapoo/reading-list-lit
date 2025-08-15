import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./item-list";
import "./reading-item";
import { createMockItems } from "../../tests/utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "../../tests/utils/helpers";
import type { ReadingItem } from "../types";
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

	describe("空状態", () => {
		it("アイテムがない時は空状態メッセージを表示する", async () => {
			itemList.items = [];
			await waitForUpdates(itemList);

			const emptyMessage = itemList.shadowRoot?.querySelector(".empty-state");
			expect(emptyMessage).toBeTruthy();
			expect(emptyMessage?.textContent).toContain("No items");
		});
	});

	describe("アイテム表示", () => {
		it("複数のアイテムが表示される", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			expect(items?.length).toBe(3);
		});

		it("各アイテムに正しいデータが渡される", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			items?.forEach((item, index) => {
				const readingItem = item as HTMLElement & { item: ReadingItem };
				expect(readingItem.item).toEqual(mockItems[index]);
			});
		});

		it("ローディング状態を表示できる", async () => {
			itemList.loading = true;
			await waitForUpdates(itemList);

			const loader = itemList.shadowRoot?.querySelector(".loading-state");
			expect(loader).toBeTruthy();
		});

		it("ローディング中はアイテムが表示されない", async () => {
			itemList.items = mockItems;
			itemList.loading = true;
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			const loader = itemList.shadowRoot?.querySelector(".loading-state");

			expect(items?.length).toBe(0);
			expect(loader).toBeTruthy();
		});
	});

	describe("イベント伝播", () => {
		it("アイテムクリックイベントが伝播される", async () => {
			const listener = vi.fn();
			itemList.addEventListener("item-click", listener);

			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const firstItem = itemList.shadowRoot?.querySelector("reading-item");
			// composed: trueを追加してShadow DOMを超えて伝播させる
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

		it("削除イベントが伝播される", async () => {
			const listener = vi.fn();
			itemList.addEventListener("item-delete", listener);

			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const secondItem =
				itemList.shadowRoot?.querySelectorAll("reading-item")[1];
			// composed: trueを追加してShadow DOMを超えて伝播させる
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

	describe("エラー状態", () => {
		it("エラーメッセージを表示できる", async () => {
			itemList.error = "Failed to load items";
			await waitForUpdates(itemList);

			const errorMessage = itemList.shadowRoot?.querySelector(".error-state");
			expect(errorMessage).toBeTruthy();
			expect(errorMessage?.textContent).toContain("Failed to load items");
		});

		it("エラー時はアイテムが表示されない", async () => {
			itemList.items = mockItems;
			itemList.error = "Error occurred";
			await waitForUpdates(itemList);

			const items = itemList.shadowRoot?.querySelectorAll("reading-item");
			const errorMessage = itemList.shadowRoot?.querySelector(".error-state");

			expect(items?.length).toBe(0);
			expect(errorMessage).toBeTruthy();
		});
	});

	describe("アクセシビリティ", () => {
		it("ローディング時にスクリーンリーダー向けのライブリージョンが存在する", async () => {
			itemList.loading = true;
			await waitForUpdates(itemList);

			const liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion).toBeTruthy();
			expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
			expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
			expect(liveRegion?.textContent?.trim()).toBe("Loading items...");
		});

		it("アイテム表示時にスクリーンリーダー向けのライブリージョンが存在する", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion).toBeTruthy();
			expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
			expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
			expect(liveRegion?.textContent?.trim()).toBe("3 items loaded");
		});

		it("ライブリージョンにsr-onlyクラスが適用されている", async () => {
			itemList.items = mockItems;
			await waitForUpdates(itemList);

			const liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.classList.contains("sr-only")).toBe(true);
		});

		it("単数・複数形が正しく表示される", async () => {
			// 0件の場合（複数形）
			itemList.items = [];
			await waitForUpdates(itemList);
			let liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("0 items loaded");

			// 1件の場合（単数形）
			itemList.items = [mockItems[0]];
			await waitForUpdates(itemList);
			liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("1 item loaded");

			// 2件以上の場合（複数形）
			itemList.items = [mockItems[0], mockItems[1]];
			await waitForUpdates(itemList);
			liveRegion = itemList.shadowRoot?.querySelector('[role="status"]');
			expect(liveRegion?.textContent?.trim()).toBe("2 items loaded");
		});

		it("アイテム数が変更されたときライブリージョンが更新される", async () => {
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
