import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ReadingItem } from "../types";

@customElement("reading-item")
export class ReadingItemElement extends LitElement {
	@property({ type: Object })
	item!: ReadingItem;

	@state()
	private showDefaultIcon = false;

	private handleItemClick(event: MouseEvent) {
		// 削除ボタンのクリックは無視
		if ((event.target as HTMLElement).closest(".delete-button")) {
			return;
		}

		// Always prevent default to avoid any browser link behavior
		event.preventDefault();
		event.stopPropagation();

		// Check for modifier keys for new tab
		const newTab = event.ctrlKey || event.metaKey || event.shiftKey;

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

	private formatUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname.replace(/^www\./, ""); // Remove 'www.' prefix
		} catch {
			return url; // Fallback to original URL if parsing fails
		}
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
						<span class="item-url" title="${url}">${this.formatUrl(url)}</span>
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
