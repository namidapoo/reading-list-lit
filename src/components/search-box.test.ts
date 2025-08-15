import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./search-box";
import { searchQueries } from "../../tests/utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForDebounce,
	waitForUpdates,
} from "../../tests/utils/helpers";
import type { SearchBox } from "./search-box";

describe("SearchBox", () => {
	let container: HTMLDivElement;
	let searchBox: SearchBox;

	beforeEach(async () => {
		// コンテナをクリーンアップ
		document.body.innerHTML = "";
		container = createTestContainer();

		// SearchBoxコンポーネントを作成
		searchBox = document.createElement("search-box") as SearchBox;
		container.appendChild(searchBox);

		// コンポーネントの更新を待つ
		await waitForUpdates(searchBox);
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	describe("レンダリング", () => {
		it("検索入力フィールドが表示される", async () => {
			const input = searchBox.shadowRoot?.querySelector("input[type='search']");

			expect(input).toBeTruthy();
			expect(input?.getAttribute("placeholder")).toBe("Search...");
		});

		it("検索アイコンが表示される", async () => {
			const icon = searchBox.shadowRoot?.querySelector(".search-icon");

			expect(icon).toBeTruthy();
		});

		it("初期値が空文字列である", async () => {
			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			expect(input?.value).toBe("");
		});

		it("valueプロパティで初期値を設定できる", async () => {
			searchBox.value = "initial search";
			await searchBox.updateComplete;

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			expect(input?.value).toBe("initial search");
		});
	});

	describe("入力イベント", () => {
		it("入力時にvalueプロパティが更新される", async () => {
			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			// 入力をシミュレート
			input.value = "test search";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			await searchBox.updateComplete;

			expect(searchBox.value).toBe("test search");
		});

		it("プログラムでvalueを変更してもイベントは発火しない", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			searchBox.value = "programmatic change";
			await searchBox.updateComplete;

			// デバウンス時間を待つ（プログラム的変更はイベントを発火しない）
			await waitForDebounce();

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe("search-changedイベント", () => {
		it("入力時にsearch-changedイベントが発火する", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			input.value = "search query";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			// デバウンス完了を待つ
			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalledTimes(1);
				expect(listener).toHaveBeenCalledWith(
					expect.objectContaining({
						detail: { value: "search query" },
					}),
				);
			});
		});

		it("連続入力時はデバウンスされる", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			// 連続して3回入力
			input.value = "a";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			await new Promise((resolve) => setTimeout(resolve, 30));

			input.value = "ab";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			await new Promise((resolve) => setTimeout(resolve, 30));

			input.value = "abc";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			// デバウンス時間を待つ
			await waitForDebounce();

			// 最後の値のみでイベントが1回だけ発火する
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "abc" },
				}),
			);
		});

		it("100ms以内の連続入力はデバウンスされる", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			// 50ms間隔で入力
			const values = ["t", "te", "tes", "test"];
			for (const value of values) {
				input.value = value;
				input.dispatchEvent(new Event("input", { bubbles: true }));
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			// デバウンス時間を待つ
			await waitForDebounce();

			// 最後の値のみでイベントが発火
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "test" },
				}),
			);
		});
	});

	describe("クリア機能", () => {
		it("値がある時にクリアボタンが表示される", async () => {
			searchBox.value = "some text";
			await searchBox.updateComplete;

			const clearButton = searchBox.shadowRoot?.querySelector(".clear-button");

			expect(clearButton).toBeTruthy();
		});

		it("値が空の時はクリアボタンが表示されない", async () => {
			searchBox.value = "";
			await searchBox.updateComplete;

			const clearButton = searchBox.shadowRoot?.querySelector(".clear-button");

			expect(clearButton).toBeFalsy();
		});

		it("クリアボタンをクリックすると値がクリアされる", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			searchBox.value = "text to clear";
			await searchBox.updateComplete;

			const clearButton = searchBox.shadowRoot?.querySelector(
				".clear-button",
			) as HTMLButtonElement;

			clearButton.click();
			await searchBox.updateComplete;

			// デバウンス時間を待つ
			await waitForDebounce();

			expect(searchBox.value).toBe("");
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "" },
				}),
			);
		});
	});

	describe("エッジケース", () => {
		it("RegExp特殊文字を含む検索文字列を安全に処理する", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const specialChars = searchQueries.regexSpecial;

			for (const query of specialChars) {
				const input = searchBox.shadowRoot?.querySelector(
					"input",
				) as HTMLInputElement;

				// 入力値を設定
				input.value = query;
				input.dispatchEvent(new Event("input"));
				await searchBox.updateComplete;

				// デバウンス時間を待つ
				await new Promise((resolve) => setTimeout(resolve, 150));

				// イベントが発火し、特殊文字がそのまま渡されることを確認
				expect(listener).toHaveBeenCalledWith(
					expect.objectContaining({
						detail: { value: query },
					}),
				);

				// クリア
				listener.mockClear();
			}
		});

		it("非常に長い検索文字列（1000文字）を処理できる", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const longQuery = "a".repeat(1000);
			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			input.value = longQuery;
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// デバウンス時間を待つ
			await waitForDebounce();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: longQuery },
				}),
			);
		});

		it("日本語入力（IME）中でもイベントは発火する", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			// IME入力開始（compositionstart）
			input.dispatchEvent(new CompositionEvent("compositionstart"));

			// IME入力中の文字入力
			input.value = "にほんご";
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// デバウンス時間を待つ
			await waitForDebounce();

			// IME入力中でもイベントは発火する（コンポーネントがIME制御を実装していないため）
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "にほんご" },
				}),
			);

			// IME確定（compositionend）
			input.dispatchEvent(new CompositionEvent("compositionend"));
		});

		it("絵文字を含む検索文字列を処理できる", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const emojiQuery = "検索 🔍 テスト 🎉";
			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			input.value = emojiQuery;
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// デバウンス時間を待つ
			await waitForDebounce();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: emojiQuery },
				}),
			);
		});

		it("空白文字のみの検索でも正しく処理する", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const query = "   ";
			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			input.value = query;
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// デバウンス時間を待つ
			await waitForDebounce();

			expect(listener).toHaveBeenCalledTimes(1);
			const calledEvent = listener.mock.calls[0][0] as CustomEvent;
			expect(calledEvent.detail.value).toBe(query);
		});
	});
});
