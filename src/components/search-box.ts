import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("search-box")
export class SearchBox extends LitElement {
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
