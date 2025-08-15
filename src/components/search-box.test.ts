import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./search-box";
import { searchQueries } from "@test-utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForDebounce,
	waitForUpdates,
} from "@test-utils/helpers";
import type { SearchBox } from "./search-box";

describe("SearchBox", () => {
	let container: HTMLDivElement;
	let searchBox: SearchBox;

	beforeEach(async () => {
		// Clean up container
		document.body.innerHTML = "";
		container = createTestContainer();

		// Create SearchBox component
		searchBox = document.createElement("search-box") as SearchBox;
		container.appendChild(searchBox);

		// Wait for component updates
		await waitForUpdates(searchBox);
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("displays search input field", async () => {
			const input = searchBox.shadowRoot?.querySelector("input[type='search']");

			expect(input).toBeTruthy();
			expect(input?.getAttribute("placeholder")).toBe("Search...");
		});

		it("displays search icon", async () => {
			const icon = searchBox.shadowRoot?.querySelector(".search-icon");

			expect(icon).toBeTruthy();
		});

		it("has empty initial value", async () => {
			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			expect(input?.value).toBe("");
		});

		it("can set initial value with value property", async () => {
			searchBox.value = "initial search";
			await searchBox.updateComplete;

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			expect(input?.value).toBe("initial search");
		});
	});

	describe("Input events", () => {
		it("updates value property on input", async () => {
			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			// Simulate input
			input.value = "test search";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			await searchBox.updateComplete;

			expect(searchBox.value).toBe("test search");
		});

		it("does not fire event when value is changed programmatically", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			searchBox.value = "programmatic change";
			await searchBox.updateComplete;

			// Wait for debounce time (programmatic changes don't fire events)
			await waitForDebounce();

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe("search-changed event", () => {
		it("fires search-changed event on input", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			input.value = "search query";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			// Wait for debounce to complete
			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalledTimes(1);
				expect(listener).toHaveBeenCalledWith(
					expect.objectContaining({
						detail: { value: "search query" },
					}),
				);
			});
		});

		it("debounces consecutive inputs", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			// Input 3 times consecutively
			input.value = "a";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			await new Promise((resolve) => setTimeout(resolve, 30));

			input.value = "ab";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			await new Promise((resolve) => setTimeout(resolve, 30));

			input.value = "abc";
			input.dispatchEvent(new Event("input", { bubbles: true }));

			// Wait for debounce time
			await waitForDebounce();

			// Event fires only once with the last value
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "abc" },
				}),
			);
		});

		it("debounces consecutive inputs within 100ms", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input[type='search']",
			) as HTMLInputElement;

			// Input at 50ms intervals
			const values = ["t", "te", "tes", "test"];
			for (const value of values) {
				input.value = value;
				input.dispatchEvent(new Event("input", { bubbles: true }));
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			// Wait for debounce time
			await waitForDebounce();

			// Event fires only with the last value
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "test" },
				}),
			);
		});
	});

	describe("Clear functionality", () => {
		it("shows clear button when value exists", async () => {
			searchBox.value = "some text";
			await searchBox.updateComplete;

			const clearButton = searchBox.shadowRoot?.querySelector(".clear-button");

			expect(clearButton).toBeTruthy();
		});

		it("hides clear button when value is empty", async () => {
			searchBox.value = "";
			await searchBox.updateComplete;

			const clearButton = searchBox.shadowRoot?.querySelector(".clear-button");

			expect(clearButton).toBeFalsy();
		});

		it("clears value when clear button is clicked", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			searchBox.value = "text to clear";
			await searchBox.updateComplete;

			const clearButton = searchBox.shadowRoot?.querySelector(
				".clear-button",
			) as HTMLButtonElement;

			clearButton.click();
			await searchBox.updateComplete;

			// Wait for debounce time
			await waitForDebounce();

			expect(searchBox.value).toBe("");
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "" },
				}),
			);
		});
	});

	describe("Edge cases", () => {
		it("safely handles search strings with RegExp special characters", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const specialChars = searchQueries.regexSpecial;

			for (const query of specialChars) {
				const input = searchBox.shadowRoot?.querySelector(
					"input",
				) as HTMLInputElement;

				// Set input value
				input.value = query;
				input.dispatchEvent(new Event("input"));
				await searchBox.updateComplete;

				// Wait for debounce time
				await new Promise((resolve) => setTimeout(resolve, 150));

				// Verify event fires and special characters are passed as-is
				expect(listener).toHaveBeenCalledWith(
					expect.objectContaining({
						detail: { value: query },
					}),
				);

				// Clear
				listener.mockClear();
			}
		});

		it("handles very long search strings (1000 characters)", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const longQuery = "a".repeat(1000);
			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			input.value = longQuery;
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// Wait for debounce time
			await waitForDebounce();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: longQuery },
				}),
			);
		});

		it("fires event even during IME (Japanese input) composition", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			// Start IME input (compositionstart)
			input.dispatchEvent(new CompositionEvent("compositionstart"));

			// Input text during IME composition
			input.value = "nihongo";
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// Wait for debounce time
			await waitForDebounce();

			// Event fires even during IME input (component doesn't implement IME control)
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: "nihongo" },
				}),
			);

			// Confirm IME input (compositionend)
			input.dispatchEvent(new CompositionEvent("compositionend"));
		});

		it("handles search strings with emojis", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const emojiQuery = "search 🔍 test 🎉";
			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			input.value = emojiQuery;
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// Wait for debounce time
			await waitForDebounce();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: { value: emojiQuery },
				}),
			);
		});

		it("correctly handles whitespace-only search", async () => {
			const listener = vi.fn();
			searchBox.addEventListener("search-changed", listener);

			const query = "   ";
			const input = searchBox.shadowRoot?.querySelector(
				"input",
			) as HTMLInputElement;

			input.value = query;
			input.dispatchEvent(new Event("input"));
			await searchBox.updateComplete;

			// Wait for debounce time
			await waitForDebounce();

			expect(listener).toHaveBeenCalledTimes(1);
			const calledEvent = listener.mock.calls[0][0] as CustomEvent;
			expect(calledEvent.detail.value).toBe(query);
		});
	});
});
