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

	describe("エラー表示", () => {
		it("エラーメッセージが表示される", async () => {
			errorMessage.message = "テストエラーメッセージ";
			await waitForUpdates(errorMessage);

			const messageDiv = errorMessage.shadowRoot?.querySelector(".message");
			expect(messageDiv?.textContent).toBe("テストエラーメッセージ");
		});

		it("エラーメッセージが空の場合は何も表示されない", async () => {
			errorMessage.message = "";
			await waitForUpdates(errorMessage);

			const container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeFalsy();
		});

		it("エラータイプによってスタイルが変わる", async () => {
			// 通常のエラー
			errorMessage.message = "通常のエラー";
			errorMessage.type = "error";
			await waitForUpdates(errorMessage);

			let container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("error")).toBe(true);

			// 警告
			errorMessage.type = "warning";
			await waitForUpdates(errorMessage);

			container = errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("warning")).toBe(true);

			// 情報
			errorMessage.type = "info";
			await waitForUpdates(errorMessage);

			container = errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("info")).toBe(true);
		});

		it("アイコンが表示される", async () => {
			errorMessage.message = "エラー";
			errorMessage.type = "error";
			await waitForUpdates(errorMessage);

			const icon = errorMessage.shadowRoot?.querySelector(".icon");
			expect(icon).toBeTruthy();
		});
	});

	describe("自動非表示", () => {
		it("指定時間後に自動的に非表示になる", async () => {
			vi.useFakeTimers();

			errorMessage.message = "自動非表示テスト";
			errorMessage.autoHide = true;
			errorMessage.autoHideDelay = 3000;
			await waitForUpdates(errorMessage);

			// 初期状態では表示されている
			let container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeTruthy();

			// 3秒経過
			vi.advanceTimersByTime(3000);
			await waitForUpdates(errorMessage);

			// 非表示になっている
			container = errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container?.classList.contains("hiding")).toBe(true);

			vi.useRealTimers();
		});

		it("autoHideがfalseの場合は非表示にならない", async () => {
			vi.useFakeTimers();

			errorMessage.message = "永続表示テスト";
			errorMessage.autoHide = false;
			await waitForUpdates(errorMessage);

			// 5秒経過
			vi.advanceTimersByTime(5000);
			await waitForUpdates(errorMessage);

			// まだ表示されている
			const container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeTruthy();
			expect(container?.classList.contains("hiding")).toBe(false);

			vi.useRealTimers();
		});
	});

	describe("閉じるボタン", () => {
		it("閉じるボタンをクリックすると非表示になる", async () => {
			errorMessage.message = "閉じるボタンテスト";
			errorMessage.showCloseButton = true;
			await waitForUpdates(errorMessage);

			const closeButton = errorMessage.shadowRoot?.querySelector(
				".close-button",
			) as HTMLButtonElement;
			expect(closeButton).toBeTruthy();

			// クリック
			closeButton.click();
			await waitForUpdates(errorMessage);

			// 非表示になっている
			const container =
				errorMessage.shadowRoot?.querySelector(".error-container");
			expect(container).toBeFalsy();
		});

		it("showCloseButtonがfalseの場合は閉じるボタンが表示されない", async () => {
			errorMessage.message = "閉じるボタンなし";
			errorMessage.showCloseButton = false;
			await waitForUpdates(errorMessage);

			const closeButton =
				errorMessage.shadowRoot?.querySelector(".close-button");
			expect(closeButton).toBeFalsy();
		});
	});

	describe("イベント", () => {
		it("エラークリア時にerror-clearedイベントが発火する", async () => {
			const listener = vi.fn();
			errorMessage.addEventListener("error-cleared", listener);

			errorMessage.message = "イベントテスト";
			errorMessage.showCloseButton = true;
			await waitForUpdates(errorMessage);

			const closeButton = errorMessage.shadowRoot?.querySelector(
				".close-button",
			) as HTMLButtonElement;
			closeButton.click();

			expect(listener).toHaveBeenCalled();
		});

		it("新しいエラーメッセージが設定されるとerror-shownイベントが発火する", async () => {
			const listener = vi.fn();
			errorMessage.addEventListener("error-shown", listener);

			errorMessage.message = "新しいエラー";
			await waitForUpdates(errorMessage);

			expect(listener).toHaveBeenCalled();
		});
	});

	describe("特定のエラー対応", () => {
		it("ストレージ容量超過エラーの場合、特別なメッセージが表示される", async () => {
			errorMessage.message = "Storage limit reached";
			errorMessage.type = "error";
			await waitForUpdates(errorMessage);

			const messageDiv = errorMessage.shadowRoot?.querySelector(".message");
			expect(messageDiv?.textContent).toContain("Storage limit reached");

			// 追加の説明があるか確認
			const description =
				errorMessage.shadowRoot?.querySelector(".description");
			expect(description?.textContent).toContain("512");
		});

		it("ネットワークエラーの場合、リトライボタンが表示される", async () => {
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

		it("リトライボタンクリックでretryイベントが発火する", async () => {
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
