import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ReadingItem } from "../types";

@customElement("reading-item")
export class ReadingItemElement extends LitElement {
	static override styles = css`
		:host {
			--base-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
				Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
			--base-font-size: 13px;
			--base-line-height: 1.4;
			--rl-bg-color: #f7f7f7;
			--rl-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
			--rl-link-color: #555;
			--rl-link-hover-bg: #fff;
			--primary-color: #66cc98;
			--primary-color-focus: #44aa76;
			--rl-item-gap: 0.5rem;
			
			font-family: var(--base-font);
			font-size: var(--base-font-size);
			line-height: var(--base-line-height);
			display: block;
		}

		*,
		*::before,
		*::after {
			box-sizing: border-box;
		}

		:focus-visible {
			outline: 3px solid lightblue;
		}

		.item-container {
			border-radius: 4px;
			padding: 0;
			margin: 0;
			position: relative;
			overflow: hidden;
			transition: all 0.5s ease 0s;
			color: var(--rl-link-color);
			background-color: var(--rl-bg-color);
			box-shadow: var(--rl-shadow);
			cursor: pointer;
			display: flex;
			align-items: center;
			padding: 10px 50px 10px 56px;
			min-height: 56px;
			text-decoration: none;
		}

		.item-container:hover {
			background-color: var(--rl-link-hover-bg);
			color: var(--primary-color);
		}

		.item-favicon,
		.default-icon {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			left: var(--rl-item-gap);
			width: 36px;
			height: 36px;
			border-radius: 0.25rem;
			border: 1px solid #ccc;
			padding: 1px;
			object-fit: contain;
		}

		.default-icon {
			padding: 6px;
			color: #999;
			background: #fff;
		}

		

		.item-content {
			flex: 1;
			min-width: 0;
		}

		.item-title {
			display: block;
			font-weight: bold;
			margin-bottom: 4px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: inherit;
		}

		.item-meta {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 0.9em;
			opacity: 0.8;
		}

		.item-url {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 200px;
		}

		.item-time {
			white-space: nowrap;
			font-size: 0.85em;
		}

		.delete-button {
			position: absolute;
			text-align: center;
			font-weight: bold;
			top: 50%;
			transform: translateY(-50%);
			right: 0.5rem;
			padding: 4px;
			border-radius: 4px;
			width: 32px;
			height: 32px;
			border: 1px solid transparent;
			background: transparent;
			z-index: 2;
			color: #999;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.delete-button:hover {
			color: #ff6b6b;
			background: rgba(255, 107, 107, 0.1);
			border-color: #ff6b6b;
		}

		.delete-button:focus-visible {
			outline: 3px solid lightblue;
		}

		.delete-button svg {
			width: 14px;
			height: 14px;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		.item-container:hover .delete-button svg {
			opacity: 1;
		}

		@media (prefers-color-scheme: dark) {
			:host {
				--rl-bg-color: #23272e;
				--rl-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
				--rl-link-color: #e0e0e0;
				--rl-link-hover-bg: #2c313a;
			}

			.item-container {
				background-color: var(--rl-bg-color);
				color: var(--rl-link-color);
			}

			.item-container:hover {
				background-color: var(--rl-link-hover-bg);
				color: var(--primary-color);
			}

			.item-favicon,
		.default-icon {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			left: var(--rl-item-gap);
			width: 36px;
			height: 36px;
			border-radius: 0.25rem;
			border: 1px solid #ccc;
			padding: 1px;
			object-fit: contain;
		}

			.default-icon {
				background: #2c313a;
				color: #888;
			}

			.delete-button {
				color: #666;
			}

			.delete-button:hover {
				color: #ff9999;
				background: rgba(255, 153, 153, 0.1);
				border-color: #ff9999;
		}
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
					<div class="item-title" title="${title}">${title}</div>
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
