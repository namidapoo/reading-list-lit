import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ReadingItem } from "@/types";
import { earthIcon, trashIcon } from "./icons";

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
			--primary-color: #3EA8FF;
			--primary-color-focus: #2196F3;
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
			padding: 12px;
			margin: 0;
			transition: all 0.5s ease 0s;
			color: var(--rl-link-color);
			background-color: var(--rl-bg-color);
			border: 1px solid rgba(0, 0, 0, 0.08);
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 12px;
			min-height: 0;
			text-decoration: none;
		}

		.item-container:hover {
			background-color: var(--rl-link-hover-bg);
		}

		.item-container:hover:not(:has(.delete-button:hover)) .item-title,
		.item-container:hover:not(:has(.delete-button:hover)) .item-url {
			color: var(--primary-color);
		}

		.item-favicon,
		.default-icon {
			flex-shrink: 0;
			width: 24px;
			height: 24px;
			object-fit: contain;
		}

		.default-icon {
			padding: 0;
			color: #999;
			background: #fff;
			border-radius: 4px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.default-icon svg {
			width: 18px;
			height: 18px;
		}

		.item-content {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
		}

		.item-title {
			display: block;
			font-weight: bold;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: inherit;
		}

		.item-meta {
			display: flex;
			align-items: baseline;
			gap: 8px;
			font-size: 0.9em;
			opacity: 0.8;
		}

		.item-url {
			flex: 0 1 auto;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.item-time {
			flex: 0 0 auto;
			white-space: nowrap;
			color: #999;
		}

		.delete-button {
			flex-shrink: 0;
			padding: 0;
			width: 32px;
			height: 32px;
			border: none;
			background: transparent;
			color: #999;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: color 0.2s ease;
		}

		.delete-button:hover {
			color: #ff6b6b;
		}

		.delete-button:focus-visible {
			outline: 3px solid lightblue;
		}

		.delete-button svg {
			width: 15px;
			height: 15px;
			opacity: 0;
			transition: opacity 0.2s ease, color 0.2s ease;
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
				border-color: rgba(255, 255, 255, 0.1);
			}

			.item-container:hover {
				background-color: var(--rl-link-hover-bg);
			}

			.item-container:hover:not(:has(.delete-button:hover)) .item-title,
			.item-container:hover:not(:has(.delete-button:hover)) .item-url {
				color: var(--primary-color);
			}

			.item-favicon,
			.default-icon {
				flex-shrink: 0;
				width: 24px;
				height: 24px;
				border-radius: 0;
				object-fit: contain;
			}

			.default-icon {
				background: #2c313a;
				color: #888;
				border-radius: 4px;
			}

			.item-time {
				color: #aaa;
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
		// Ignore clicks on delete button
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
							<span class="default-icon">${earthIcon()}</span>
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
					${trashIcon()}
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
