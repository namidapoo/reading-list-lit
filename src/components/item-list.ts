import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ReadingItem } from "../types";
import { octagonAlertIcon } from "./icons";
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
			gap: 8px;
			padding: 0;
		}

		.empty-state,
		.loading-state,
		.error-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 20px 0;
			text-align: center;
			color: #666;
		}

		.empty-text {
			font-size: 0.9rem;
			color: #999;
		}

		.error-icon {
			width: 48px;
			height: 48px;
			margin-bottom: 0;
			opacity: 0.5;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.error-icon svg {
			width: 48px;
			height: 48px;
		}

		.loading-spinner {
			width: 32px;
			height: 32px;
			border: 3px solid #f3f3f3;
			border-top: 3px solid #3EA8FF;
			border-radius: 0;
			animation: spin 1s linear infinite;
			margin-bottom: 0;
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
			margin: 0;
			font-size: 1.2rem;
			font-weight: 600;
			color: #333;
		}

		p {
			margin: 0;
			font-size: 0.9rem;
			line-height: 1;
		}

		/* スクリーンリーダー専用のスタイル */
		.sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
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

			.empty-text {
				color: #888;
			}

			.loading-spinner {
				border-color: #333;
				border-top-color: #3EA8FF;
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
				<div 
					role="status" 
					aria-live="polite" 
					aria-atomic="true"
					class="sr-only"
				>
					0 items loaded
				</div>
				<p class="empty-text">No items</p>
			</div>
		`;
	}

	private renderLoading() {
		return html`
			<div class="loading-state">
				<div 
					role="status" 
					aria-live="polite" 
					aria-atomic="true"
					class="sr-only"
				>
					Loading items...
				</div>
				<div class="loading-spinner"></div>
				<div class="loading-text">Loading items...</div>
			</div>
		`;
	}

	private renderError() {
		return html`
			<div class="error-state">
				<span class="error-icon">${octagonAlertIcon()}</span>
				<h3>Error</h3>
				<p>${this.error}</p>
			</div>
		`;
	}

	private renderItems() {
		return html`
			<div class="item-list-container">
				<div 
					role="status" 
					aria-live="polite" 
					aria-atomic="true"
					class="sr-only"
				>
					${this.items.length} ${this.items.length === 1 ? "item" : "items"} loaded
				</div>
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
