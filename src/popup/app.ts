import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ReadingListStorage } from "../lib/storage";
import type { ReadingItem } from "../types";
import "../components/search-box";
import "../components/item-list";
import "../components/error-message";

@customElement("reading-list-popup")
export class ReadingListPopup extends LitElement {
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
			this.error = "";
			await this.loadItems();

			// Clear success message after 3 seconds
			setTimeout(() => {
				this.successMessage = "";
			}, 3000);
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
			this.successMessage = "";
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
