import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./app";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "../../tests/utils/helpers";
import type { ReadingListPopup } from "./app";

describe("検索ボックスのXSS対策", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = createTestContainer();
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	it("検索クエリに悪意のあるスクリプトが含まれても実行されない", async () => {
		// Chrome API のモック
		const mockChrome = {
			storage: {
				sync: {
					get: vi.fn().mockResolvedValue({ items: [] }),
					set: vi.fn().mockResolvedValue(undefined),
					onChanged: {
						addListener: vi.fn(),
						removeListener: vi.fn(),
					},
				},
			},
		};
		globalThis.chrome = mockChrome as unknown as typeof chrome;

		const popup = document.createElement(
			"reading-list-popup",
		) as ReadingListPopup;
		container.appendChild(popup);
		await waitForUpdates(popup);

		const searchBox = popup.shadowRoot?.querySelector("search-box");
		const maliciousQuery = "<img src=x onerror=alert('XSS')>";

		// alertが呼ばれないことを確認
		const alertSpy = vi.spyOn(window, "alert");

		searchBox?.dispatchEvent(
			new CustomEvent("search-changed", {
				detail: { value: maliciousQuery },
				bubbles: true,
			}),
		);

		await waitForUpdates(popup);
		expect(alertSpy).not.toHaveBeenCalled();
	});
});
