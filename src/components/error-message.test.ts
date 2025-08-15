import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./error-message";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ErrorMessage } from "./error-message";

describe("ErrorMessage", () => {
	let container: HTMLDivElement;
	let errorMessage: ErrorMessage;

	beforeEach(async () => {
		document.body.innerHTML = "";
		container = createTestContainer();

		errorMessage = document.createElement("error-message") as ErrorMessage;
		container.appendChild(errorMessage);
		await waitForUpdates(errorMessage);
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	describe("Error display", () => {
		it("displays error message", async () => {
			errorMessage.message = "Test error message";
			await waitForUpdates(errorMessage);

			const messageDiv = errorMessage.shadowRoot?.querySelector(".message");
			expect(messageDiv?.textContent).toBe("Test error message");
		});

		it("displays nothing when error message is empty", async () => {
			errorMessage.message = "";
			await waitForUpdates(errorMessage);

			const container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeFalsy();
		});

		it("changes style based on error type", async () => {
			// Normal error
			errorMessage.message = "Normal error";
			errorMessage.type = "error";
			await waitForUpdates(errorMessage);

			let container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("error")).toBe(true);

			// Warning
			errorMessage.type = "warning";
			await waitForUpdates(errorMessage);

			container = errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("warning")).toBe(true);

			// Info
			errorMessage.type = "info";
			await waitForUpdates(errorMessage);

			container = errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("info")).toBe(true);
		});

		it("displays icon", async () => {
			errorMessage.message = "Error";
			errorMessage.type = "error";
			await waitForUpdates(errorMessage);

			const icon = errorMessage.shadowRoot?.querySelector(".icon");
			expect(icon).toBeTruthy();
		});
	});

	describe("Auto-hide", () => {
		it("automatically hides after specified time", async () => {
			vi.useFakeTimers();

			errorMessage.message = "Auto-hide test";
			errorMessage.autoHide = true;
			errorMessage.autoHideDelay = 3000;
			await waitForUpdates(errorMessage);

			// Initially displayed
			let container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeTruthy();

			// 3 seconds pass
			vi.advanceTimersByTime(3000);
			await waitForUpdates(errorMessage);

			// Now hidden
			container = errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("hiding")).toBe(true);

			vi.useRealTimers();
		});

		it("does not hide when autoHide is false", async () => {
			vi.useFakeTimers();

			errorMessage.message = "Persistent display test";
			errorMessage.autoHide = false;
			await waitForUpdates(errorMessage);

			// 5 seconds pass
			vi.advanceTimersByTime(5000);
			await waitForUpdates(errorMessage);

			// Still displayed
			const container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeTruthy();
			expect(container?.classList.contains("hiding")).toBe(false);

			vi.useRealTimers();
		});
	});

	describe("Close button", () => {
		it("hides when close button is clicked", async () => {
			errorMessage.message = "Close button test";
			errorMessage.showCloseButton = true;
			await waitForUpdates(errorMessage);

			const closeButton = errorMessage.shadowRoot?.querySelector(
				".close-button",
			) as HTMLButtonElement;
			expect(closeButton).toBeTruthy();

			// Click
			closeButton.click();
			await waitForUpdates(errorMessage);

			// Now hidden
			const container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeFalsy();
		});

		it("does not show close button when showCloseButton is false", async () => {
			errorMessage.message = "No close button";
			errorMessage.showCloseButton = false;
			await waitForUpdates(errorMessage);

			const closeButton =
				errorMessage.shadowRoot?.querySelector(".close-button");
			expect(closeButton).toBeFalsy();
		});
	});

	describe("Events", () => {
		it("fires error-cleared event when error is cleared", async () => {
			const listener = vi.fn();
			errorMessage.addEventListener("error-cleared", listener);

			errorMessage.message = "Event test";
			errorMessage.showCloseButton = true;
			await waitForUpdates(errorMessage);

			const closeButton = errorMessage.shadowRoot?.querySelector(
				".close-button",
			) as HTMLButtonElement;
			closeButton.click();

			expect(listener).toHaveBeenCalled();
		});

		it("fires error-shown event when new error message is set", async () => {
			const listener = vi.fn();
			errorMessage.addEventListener("error-shown", listener);

			errorMessage.message = "New error";
			await waitForUpdates(errorMessage);

			expect(listener).toHaveBeenCalled();
		});
	});

	describe("Specific error handling", () => {
		it("displays special message for storage limit error", async () => {
			errorMessage.message = "Storage limit reached";
			errorMessage.type = "error";
			await waitForUpdates(errorMessage);

			const messageDiv = errorMessage.shadowRoot?.querySelector(".message");
			expect(messageDiv?.textContent).toContain("Storage limit reached");

			// Check for additional description
			const description =
				errorMessage.shadowRoot?.querySelector(".description");
			expect(description?.textContent).toContain("512");
		});

		it("shows retry button for network errors", async () => {
			errorMessage.message = "Network error";
			errorMessage.type = "error";
			errorMessage.showRetryButton = true;
			await waitForUpdates(errorMessage);

			const retryButton = errorMessage.shadowRoot?.querySelector(
				".retry-button",
			) as HTMLButtonElement;
			expect(retryButton).toBeTruthy();
			expect(retryButton.textContent?.trim()).toBe("Retry");
		});

		it("fires retry event when retry button is clicked", async () => {
			const listener = vi.fn();
			errorMessage.addEventListener("retry", listener);

			errorMessage.message = "Network error";
			errorMessage.showRetryButton = true;
			await waitForUpdates(errorMessage);

			const retryButton = errorMessage.shadowRoot?.querySelector(
				".retry-button",
			) as HTMLButtonElement;
			retryButton.click();

			expect(listener).toHaveBeenCalled();
		});
	});
});
