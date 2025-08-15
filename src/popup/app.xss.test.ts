import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./app";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ReadingListPopup } from "./app";

describe("Search box XSS protection", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = createTestContainer();
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	it("does not execute malicious scripts in search queries", async () => {
		// Chrome API mock
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

		// Verify alert is not called
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
