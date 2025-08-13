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
			display: flex;
			align-items: center;
		}

		.search-icon {
			position: absolute;
			left: 12px;
			width: 18px;
			height: 18px;
			color: #999;
			pointer-events: none;
		}

		input {
			font-size: inherit;
			font-family: inherit;
			border: 1px solid #eee;
			border-radius: 0.25rem;
			padding: 0.5rem 2rem 0.5rem 2.5rem;
			background: transparent;
			width: 100%;
			margin: 0;
			color: inherit;
			transition: border-color 0.2s ease;
		}

		input:focus {
			outline: 3px solid lightblue;
			border-color: #3EA8FF;
		}

		input[type='search'] {
			-webkit-appearance: textfield;
		}

		input[type='search']::-webkit-search-cancel-button,
		input[type='search']::-webkit-search-decoration {
			-webkit-appearance: none;
		}

		.clear-button {
			position: absolute;
			right: 8px;
			width: 24px;
			height: 24px;
			border: none;
			background: transparent;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #999;
			padding: 0;
			border-radius: 50%;
			transition: all 0.2s ease;
		}

		.clear-button:hover {
			background: #f0f0f0;
			color: #666;
		}

		.clear-button:focus-visible {
			outline: 3px solid lightblue;
		}

		@media (prefers-color-scheme: dark) {
			input {
				background: #181a20;
				color: #e0e0e0;
				border-color: #444;
			}

			input:focus {
				border-color: #3EA8FF;
			}

			.search-icon {
				color: #666;
			}

			.clear-button {
				color: #666;
			}

			.clear-button:hover {
				background: #2c313a;
				color: #999;
			}
		}
	`;

	@property({ type: String })
	value = "";

	@property({ type: String })
	placeholder = "Search...";

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
