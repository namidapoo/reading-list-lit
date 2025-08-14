import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { circlePlusIcon } from "../components/icons";
import { ReadingListStorage } from "../lib/storage";
import type { ReadingItem } from "../types";
import "../components/search-box";
import "../components/item-list";
import "../components/error-message";

@customElement("reading-list-popup")
export class ReadingListPopup extends LitElement {
	static override styles = css`
		:host {
			--base-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
				Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
			--base-font-size: 13px;
			--base-line-height: 1.4;
			--container-width: 360px;
			--spacer: 15px;
			--rl-bg-color: #f7f7f7;
			--rl-shadow: 0 1px 1px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.05);
			--rl-link-color: #555;
			--rl-link-hover-bg: #fff;
			--primary-color: #3EA8FF;
			--primary-color-focus: #2196F3;

			display: block;
			font-family: var(--base-font);
			font-size: var(--base-font-size);
			line-height: var(--base-line-height);
			width: var(--container-width);
			min-height: 400px;
			max-height: 600px;
			background: #fff;
		}

		*,
		*::before,
		*::after {
			box-sizing: border-box;
		}

		:focus-visible {
			outline: 3px solid lightblue;
		}

		.container {
			display: flex;
			flex-direction: column;
			height: 100%;
			padding: 0 1rem;
		}

		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 0 0.5rem 0;
			background: #fff;
		}

		.header-title {
			margin: 0;
			font-size: 1.2rem;
			font-weight: 600;
			color: #333;
		}

		.header-actions {
			display: flex;
			align-items: center;
			gap: 0.75rem;
		}

		.item-count {
			font-size: 0.75rem;
			color: #666;
			padding: 0.25rem 0.5rem;
			background: #f0f0f0;
			border-radius: 0.25rem;
		}

		.add-button {
			--button-size: 2rem;
			background: transparent;
			width: var(--button-size);
			height: var(--button-size);
			border: 0;
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.add-button:hover:not(:disabled) {
			transform: scale(1.05);
		}

		.add-button:hover:not(:disabled) svg circle {
			fill: var(--primary-color-focus);
		}

		.add-button:active:not(:disabled) {
			transform: scale(0.95);
		}

		.add-button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.add-button svg {
			width: 32px;
			height: 32px;
		}

		.add-button.loading svg {
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			from { transform: rotate(0deg); }
			to { transform: rotate(360deg); }
		}

		.success-message {
			padding: 0.75rem 0;
			background: #d4edda;
			color: #155724;
			border: 1px solid #c3e6cb;
			border-radius: 0.25rem;
			margin: 0.5rem 0;
			font-size: 0.9rem;
			animation: slideDown 0.25s ease-out;
		}

		@keyframes slideDown {
			from {
				transform: translateY(-10px);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		.search-container {
			padding: 0.25rem 0;
			background: transparent;
		}

		.content {
			flex: 1;
			overflow-y: auto;
			padding: 0.75rem 0;
			background: #fff;
		}

		error-message {
			margin: 0.5rem 0;
		}

		@media (prefers-color-scheme: dark) {
			:host {
				--rl-bg-color: #23272e;
				--rl-shadow: 0 1px 1px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3);
				--rl-link-color: #e0e0e0;
				--rl-link-hover-bg: #2c313a;
				background: #181a20;
			}

			.container {
			display: flex;
			flex-direction: column;
			height: 100%;
			padding: 0 1rem;
		}

			.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 0 0.5rem 0;
			background: #fff;
		}

			.header-title {
				color: #e0e0e0;
			}

			.item-count {
				background: #2c313a;
				color: #999;
			}

			.search-container {
			padding: 0.25rem 0;
			background: transparent;
		}

			.content {
			flex: 1;
			overflow-y: auto;
			padding: 0.75rem 0;
			background: #fff;
		}

			.success-message {
			padding: 0.75rem 0;
			background: #d4edda;
			color: #155724;
			border: 1px solid #c3e6cb;
			border-radius: 0.25rem;
			margin: 0.5rem 0;
			font-size: 0.9rem;
			animation: slideDown 0.25s ease-out;
		}
		}
	`;

	@state()
	private items: ReadingItem[] = [];

	@state()
	private loading = true;

	@state()
	private adding = false;

	@state()
	private searchQuery = "";

	@state()
	private itemCount = 0;

	@state()
	private error = "";

	storage: ReadingListStorage;

	constructor() {
		super();
		this.storage = new ReadingListStorage();
	}

	override connectedCallback() {
		super.connectedCallback();
		this.loadItems(true); // Initial load
		this.setupStorageListener();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		// Cleanup if needed
	}

	private setupStorageListener() {
		// Listen for storage changes from other sources
		chrome.storage.sync.onChanged.addListener(() => {
			this.loadItems(false); // Not initial load
		});
	}

	async loadItems(isInitialLoad = false) {
		try {
			// Only show loading indicator on initial load, not during search
			if (isInitialLoad) {
				this.loading = true;
			}
			this.error = "";

			if (this.searchQuery) {
				this.items = await this.storage.searchItems(this.searchQuery);
			} else {
				this.items = await this.storage.getItems();
			}

			this.itemCount = await this.storage.getItemCount();
		} catch (error) {
			this.error = "Failed to load items";
			console.error("Failed to load items:", error);
		} finally {
			if (isInitialLoad) {
				this.loading = false;
			}
		}
	}

	private async handleAddCurrentPage() {
		try {
			this.adding = true;
			this.error = "";

			// Get current tab
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab.url || !tab.title) {
				this.error = "Cannot add this page";
				return;
			}

			// Don't add chrome:// or other internal URLs
			if (
				tab.url.startsWith("chrome://") ||
				tab.url.startsWith("chrome-extension://") ||
				tab.url.startsWith("about:")
			) {
				this.error = "Cannot add browser internal pages";
				return;
			}

			await this.storage.addItem(tab.url, tab.title);
			this.error = "";
			await this.loadItems();
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes("Storage limit")) {
					this.error = "Storage limit reached";
				} else {
					this.error = "Failed to add page";
				}
			} else {
				this.error = "Failed to add page";
			}
			console.error("Failed to add page:", error);
		} finally {
			this.adding = false;
		}
	}

	private async handleSearch(event: CustomEvent) {
		this.searchQuery = event.detail.value;
		await this.loadItems();
	}

	private async handleItemClick(event: CustomEvent) {
		const { item, newTab } = event.detail;

		try {
			if (newTab) {
				// Open in new background tab
				await chrome.tabs.create({
					url: item.url,
					active: false,
				});
			} else {
				// Open in current tab
				await chrome.tabs.update({
					url: item.url,
				});
				// Close the popup after opening in current tab
				window.close();
			}
		} catch (error) {
			console.error("Failed to open URL:", error);
			this.error = "Failed to open page";
		}
	}

	private async handleItemDelete(event: CustomEvent) {
		const { item } = event.detail;

		try {
			await this.storage.removeItem(item.id);
			await this.loadItems();
		} catch (error) {
			console.error("Failed to delete item:", error);
			this.error = "Failed to delete item";
		}
	}

	private async handleRetry() {
		this.error = "";
		await this.loadItems(true); // Show loading on retry
	}

	override render() {
		return html`
			<div class="container">
				<header class="header">
					<h1 class="header-title">Reading List</h1>
					<div class="header-actions">
						<span class="item-count">
							${this.itemCount} ${this.itemCount === 1 ? "item" : "items"}
						</span>
						<button
							class="add-button ${this.adding ? "loading" : ""}"
							@click=${this.handleAddCurrentPage}
							?disabled=${this.adding}
							aria-label="Add current page"
							title="Add current page to reading list"
						>
							${circlePlusIcon()}
						</button>
					</div>
				</header>

				${
					this.error
						? html`
							<error-message
								.message=${this.error}
								type="error"
								.autoHide=${!this.error.includes("Storage limit")}
								.autoHideDelay=${5000}
								.showRetryButton=${
									this.error.includes("Network") ||
									this.error.includes("Failed to load")
								}
								@error-cleared=${() => {
									this.error = "";
								}}
								@retry=${() => this.handleRetry()}
							></error-message>
						`
						: ""
				}


				<div class="search-container">
					<search-box
						@search-changed=${this.handleSearch}
						.value=${this.searchQuery}
					></search-box>
				</div>

				<div class="content">
					<item-list
						.items=${this.items}
						.loading=${this.loading}
						@item-click=${this.handleItemClick}
						@item-delete=${this.handleItemDelete}
					></item-list>
				</div>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"reading-list-popup": ReadingListPopup;
	}
}
