import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ReadingItem } from "../types";
import "./reading-item";

@customElement("item-list")
export class ItemList extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.item-list-container {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			padding: 0 0.05rem;
		}

		.empty-state,
		.loading-state,
		.error-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 3rem 1.5rem;
			text-align: center;
			color: #666;
		}

		.empty-icon,
		.error-icon {
			width: 48px;
			height: 48px;
			margin-bottom: 1rem;
			opacity: 0.5;
		}

		.loading-spinner {
			width: 32px;
			height: 32px;
			border: 3px solid #f3f3f3;
			border-top: 3px solid #66cc98;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			margin-bottom: 1rem;
		}

		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}

		.loading-text {
			font-size: 0.9rem;
			color: #999;
		}

		h3 {
			margin: 0 0 0.5rem 0;
			font-size: 1.2rem;
			font-weight: 600;
			color: #333;
		}

		p {
			margin: 0;
			font-size: 0.9rem;
			line-height: 1.5;
		}

		.empty-help {
			color: #999;
			max-width: 300px;
		}

		@media (prefers-color-scheme: dark) {
			.empty-state,
			.loading-state,
			.error-state {
				color: #ccc;
			}

			h3 {
				color: #e0e0e0;
			}

			.empty-help {
				color: #888;
			}

			.loading-spinner {
				border-color: #333;
				border-top-color: #66cc98;
			}
		}
	`;

	@property({ type: Array })
	items: ReadingItem[] = [];

	@property({ type: Boolean })
	loading = false;

	@property({ type: String })
	error = "";

	private renderEmpty() {
		return html`
			<div class="empty-state">
				<svg
					class="empty-icon"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				<h3>No saved items yet</h3>
				<p class="empty-help">
					Save pages to read later using the + button or right-click menu
				</p>
			</div>
		`;
	}

	private renderLoading() {
		return html`
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<div class="loading-text">Loading items...</div>
			</div>
		`;
	}

	private renderError() {
		return html`
			<div class="error-state">
				<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<h3>Error</h3>
				<p>${this.error}</p>
			</div>
		`;
	}

	private renderItems() {
		return html`
			<div class="item-list-container">
				${this.items.map(
					(item) => html`
						<reading-item 
							.item=${item}
						></reading-item>
					`,
				)}
			</div>
		`;
	}

	override render() {
		if (this.loading) {
			return this.renderLoading();
		}

		if (this.error) {
			return this.renderError();
		}

		if (this.items.length === 0) {
			return this.renderEmpty();
		}

		return this.renderItems();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"item-list": ItemList;
	}
}
