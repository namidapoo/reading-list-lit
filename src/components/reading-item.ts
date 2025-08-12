import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ReadingItem } from "../types";

@customElement("reading-item")
export class ReadingItemElement extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.item-container {
			display: flex;
			align-items: center;
			padding: 12px;
			background-color: var(--color-background, #ffffff);
			border: 1px solid var(--color-border, #e5e7eb);
			border-radius: var(--radius-md, 0.375rem);
			transition: all var(--transition-fast, 150ms ease);
			cursor: pointer;
			position: relative;
		}

		.item-container:hover {
			background-color: var(--color-surface-hover, #f3f4f6);
			box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
		}

		.item-favicon,
		.default-icon {
			width: 24px;
			height: 24px;
			margin-right: 12px;
			flex-shrink: 0;
		}

		.item-favicon {
			border-radius: var(--radius-sm, 0.25rem);
			background-color: var(--color-surface, #f9fafb);
		}

		.default-icon {
			color: var(--color-text-secondary, #6b7280);
		}

		.item-content {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.item-title {
			font-size: var(--font-sm, 0.875rem);
			font-weight: 500;
			color: var(--color-text-primary, #111827);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.item-meta {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: var(--font-xs, 0.75rem);
			color: var(--color-text-secondary, #6b7280);
		}

		.item-url {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.item-time {
			flex-shrink: 0;
		}

		.delete-button {
			position: absolute;
			right: 12px;
			top: 50%;
			transform: translateY(-50%);
			width: 32px;
			height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: transparent;
			border: none;
			border-radius: var(--radius-md, 0.375rem);
			color: var(--color-text-secondary, #6b7280);
			cursor: pointer;
			transition: all var(--transition-fast, 150ms ease);
			opacity: 0;
			visibility: hidden;
		}

		.item-container:hover .delete-button {
			opacity: 1;
			visibility: visible;
		}

		.delete-button:hover {
			background-color: var(--color-danger, #dc2626);
			color: white;
		}

		.delete-button:focus-visible {
			outline: 2px solid var(--color-danger, #dc2626);
			outline-offset: 2px;
			opacity: 1;
			visibility: visible;
		}

		/* No animation to prevent lag */
	`;

	@property({ type: Object })
	item!: ReadingItem;

	@state()
	private showDefaultIcon = false;

	private handleItemClick(event: MouseEvent) {
		// 削除ボタンのクリックは無視
		if ((event.target as HTMLElement).closest(".delete-button")) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const newTab = event.ctrlKey || event.metaKey;

		this.dispatchEvent(
			new CustomEvent("item-click", {
				detail: {
					item: this.item,
					newTab,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleDelete(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		this.dispatchEvent(
			new CustomEvent("item-delete", {
				detail: {
					item: this.item,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleFaviconError() {
		this.showDefaultIcon = true;
	}

	private formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (seconds < 60) {
			return "Just now";
		}
		if (minutes < 60) {
			return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
		}
		if (hours < 24) {
			return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
		}
		return `${days} ${days === 1 ? "day" : "days"} ago`;
	}

	override render() {
		if (!this.item) {
			return html``;
		}

		const { url, title, faviconUrl, addedAt } = this.item;
		const shouldShowDefaultIcon = this.showDefaultIcon || !faviconUrl;

		return html`
			<div class="item-container" @click=${this.handleItemClick}>
				${
					shouldShowDefaultIcon
						? html`
							<svg
								class="default-icon"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
								/>
							</svg>
						`
						: html`
							<img
								class="item-favicon"
								src=${faviconUrl}
								alt=""
								@error=${this.handleFaviconError}
							/>
						`
				}

				<div class="item-content">
					<div class="item-title">${title}</div>
					<div class="item-meta">
						<span class="item-url">${url}</span>
						<span class="item-time">${this.formatRelativeTime(addedAt)}</span>
					</div>
				</div>

				<button
					class="delete-button"
					@click=${this.handleDelete}
					aria-label="Delete item"
					title="Delete item"
				>
					<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</button>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"reading-item": ReadingItemElement;
	}
}
