import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ReadingListStorage } from "./storage";
import type { ReadingItem } from "./types";
import "./components/search-box";
import "./components/item-list";

@customElement("reading-list-popup")
export class ReadingListPopup extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 400px;
			min-height: 500px;
			max-height: 600px;
			background-color: var(--color-background, #ffffff);
			color: var(--color-text-primary, #111827);
			font-family: system-ui, -apple-system, sans-serif;
		}

		.container {
			display: flex;
			flex-direction: column;
			height: 100%;
			max-height: 600px;
		}

		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 16px;
			background-color: var(--color-surface, #f9fafb);
			border-bottom: 1px solid var(--color-border, #e5e7eb);
		}

		.header-title {
			font-size: 18px;
			font-weight: 600;
			color: var(--color-text-primary, #111827);
		}

		.header-actions {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.item-count {
			font-size: 14px;
			color: var(--color-text-secondary, #6b7280);
		}

		.add-button {
			width: 36px;
			height: 36px;
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: var(--color-primary, #2563eb);
			color: white;
			border: none;
			border-radius: 50%;
			cursor: pointer;
			transition: all var(--transition-fast, 150ms ease);
			position: relative;
		}

		.add-button:hover:not(:disabled) {
			background-color: var(--color-primary-hover, #1d4ed8);
			transform: scale(1.05);
		}

		.add-button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.add-button.loading::after {
			content: "";
			position: absolute;
			width: 20px;
			height: 20px;
			border: 2px solid transparent;
			border-top-color: white;
			border-radius: 50%;
			animation: spin 0.6s linear infinite;
		}

		.add-button.loading svg {
			opacity: 0;
		}

		@keyframes spin {
			to {
				transform: rotate(360deg);
			}
		}

		.search-container {
			padding: 12px 16px;
			background-color: var(--color-background, #ffffff);
			border-bottom: 1px solid var(--color-border, #e5e7eb);
		}

		.content {
			flex: 1;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}

		.error-message {
			padding: 12px 16px;
			background-color: #fef2f2;
			color: #dc2626;
			font-size: 14px;
			border-bottom: 1px solid #fecaca;
		}

		.success-message {
			padding: 12px 16px;
			background-color: #f0fdf4;
			color: #16a34a;
			font-size: 14px;
			border-bottom: 1px solid #bbf7d0;
			animation: slideDown var(--transition-base, 250ms ease);
		}

		@keyframes slideDown {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
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

	@state()
	private successMessage = "";

	storage: ReadingListStorage;

	constructor() {
		super();
		this.storage = new ReadingListStorage();
	}

	override connectedCallback() {
		super.connectedCallback();
		this.loadItems();
		this.setupStorageListener();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		// Cleanup if needed
	}

	private setupStorageListener() {
		// Listen for storage changes from other sources
		chrome.storage.sync.onChanged.addListener(() => {
			this.loadItems();
		});
	}

	async loadItems() {
		try {
			this.loading = true;
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
			this.loading = false;
		}
	}

	private async handleAddCurrentPage() {
		try {
			this.adding = true;
			this.error = "";
			this.successMessage = "";

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
			this.successMessage = "Page added successfully";
			await this.loadItems();

			// Clear success message after 3 seconds
			setTimeout(() => {
				this.successMessage = "";
			}, 3000);
		} catch (error) {
			this.error = "Failed to add page";
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
							<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</button>
					</div>
				</header>

				${
					this.error ? html`<div class="error-message">${this.error}</div>` : ""
				}
				${
					this.successMessage
						? html`<div class="success-message">${this.successMessage}</div>`
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
