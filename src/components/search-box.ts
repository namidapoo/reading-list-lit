import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("search-box")
export class SearchBox extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.search-container {
			position: relative;
			width: 100%;
		}

		.search-icon {
			position: absolute;
			left: 12px;
			top: 50%;
			transform: translateY(-50%);
			width: 18px;
			height: 18px;
			color: var(--color-text-placeholder, #9ca3af);
			pointer-events: none;
		}

		input[type="search"] {
			width: 100%;
			padding: 10px 36px 10px 40px;
			font-size: 14px;
			border: 1px solid var(--color-border, #e5e7eb);
			border-radius: var(--radius-md, 0.375rem);
			background-color: var(--color-background, #ffffff);
			color: var(--color-text-primary, #111827);
			transition: all var(--transition-fast, 150ms ease);
		}

		input[type="search"]:focus {
			outline: none;
			border-color: var(--color-primary, #2563eb);
			box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
		}

		input[type="search"]::-webkit-search-decoration,
		input[type="search"]::-webkit-search-cancel-button,
		input[type="search"]::-webkit-search-results-button,
		input[type="search"]::-webkit-search-results-decoration {
			display: none;
		}

		.clear-button {
			position: absolute;
			right: 8px;
			top: 50%;
			transform: translateY(-50%);
			width: 24px;
			height: 24px;
			border-radius: var(--radius-full, 9999px);
			background-color: transparent;
			color: var(--color-text-secondary, #6b7280);
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: all var(--transition-fast, 150ms ease);
			border: none;
			padding: 0;
		}

		.clear-button:hover {
			background-color: var(--color-surface, #f9fafb);
			color: var(--color-text-primary, #111827);
		}

		.clear-button:focus-visible {
			outline: 2px solid var(--color-primary, #2563eb);
			outline-offset: 2px;
		}
	`;

	@property({ type: String })
	value = "";

	@property({ type: String })
	placeholder = "Search by title or URL...";

	@state()
	private debounceTimer?: number;

	private handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		this.value = input.value;

		// デバウンス処理
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.dispatchEvent(
				new CustomEvent("search-changed", {
					detail: { value: this.value },
					bubbles: true,
					composed: true,
				}),
			);
		}, 100);
	}

	private handleClear() {
		this.value = "";

		// inputイベントをシミュレートしてデバウンス処理を通す
		const input = this.shadowRoot?.querySelector("input");
		if (input) {
			input.value = "";
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}
	}

	override render() {
		return html`
			<div class="search-container">
				<svg
					class="search-icon"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="search"
					.value=${this.value}
					placeholder=${this.placeholder}
					@input=${this.handleInput}
				/>
				${
					this.value
						? html`
							<button
								class="clear-button"
								@click=${this.handleClear}
								aria-label="Clear search"
							>
								<svg
									width="14"
									height="14"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						`
						: ""
				}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"search-box": SearchBox;
	}
}
