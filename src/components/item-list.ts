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
			height: 100%;
		}

		.item-list-container {
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 8px;
			overflow-y: auto;
			overflow-x: hidden;
		}

		.empty-state,
		.loading-state,
		.error-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 48px 24px;
			text-align: center;
			color: var(--color-text-secondary, #6b7280);
		}

		.empty-icon {
			width: 64px;
			height: 64px;
			margin-bottom: 16px;
			color: var(--color-text-placeholder, #9ca3af);
		}

		.empty-state h3,
		.error-state h3 {
			font-size: var(--font-lg, 1.125rem);
			font-weight: 600;
			color: var(--color-text-primary, #111827);
			margin: 0 0 8px 0;
		}

		.empty-help {
			font-size: var(--font-sm, 0.875rem);
			line-height: 1.5;
			max-width: 300px;
		}

		.loading-state {
			gap: 12px;
		}

		.loading-spinner {
			width: 32px;
			height: 32px;
			border: 3px solid var(--color-border, #e5e7eb);
			border-top-color: var(--color-primary, #2563eb);
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			to {
				transform: rotate(360deg);
			}
		}

		.loading-text {
			font-size: var(--font-sm, 0.875rem);
		}

		.error-state {
			color: var(--color-danger, #dc2626);
		}

		.error-icon {
			width: 48px;
			height: 48px;
			margin-bottom: 16px;
		}

		/* Scrollbar styles */
		.item-list-container::-webkit-scrollbar {
			width: 6px;
		}

		.item-list-container::-webkit-scrollbar-track {
			background: var(--color-surface, #f9fafb);
			border-radius: 3px;
		}

		.item-list-container::-webkit-scrollbar-thumb {
			background: var(--color-border, #e5e7eb);
			border-radius: 3px;
		}

		.item-list-container::-webkit-scrollbar-thumb:hover {
			background: var(--color-text-placeholder, #9ca3af);
		}

		/* No animation on initial load to prevent lag */
		/* Animation will be applied via state when needed */
	`;

	@property({ type: Array })
	items: ReadingItem[] = [];

	@property({ type: Boolean })
	loading = false;

	@property({ type: String })
	error = "";

	@property({ type: String })
	maxHeight = "100%";

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
			<div 
				class="item-list-container" 
				style="max-height: ${this.maxHeight}"
			>
				${this.items.map(
					(item) => html`
						<reading-item 
							.item=${item}
							@item-click=${this.handleItemClick}
							@item-delete=${this.handleItemDelete}
						></reading-item>
					`,
				)}
			</div>
		`;
	}

	private handleItemClick(event: CustomEvent) {
		// イベントをそのまま伝播
		this.dispatchEvent(
			new CustomEvent("item-click", {
				detail: event.detail,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleItemDelete(event: CustomEvent) {
		// イベントをそのまま伝播
		this.dispatchEvent(
			new CustomEvent("item-delete", {
				detail: event.detail,
				bubbles: true,
				composed: true,
			}),
		);
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
