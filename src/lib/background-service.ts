import { ReadingListStorage } from "./storage";

export class BackgroundService {
	private storage = new ReadingListStorage();

	// Initialize extension
	async initialize() {
		console.log("Reading List extension installed");
		this.createContextMenus();
	}

	// Create context menus
	private createContextMenus() {
		// Menu to save entire page
		chrome.contextMenus.create({
			id: "save-page",
			title: "Save to Reading List",
			contexts: ["page"],
		});

		// Menu to save link
		chrome.contextMenus.create({
			id: "save-link",
			title: "Save Link to Reading List",
			contexts: ["link"],
		});
	}

	// Handle context menu clicks
	async handleContextMenuClick(
		info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) {
		if (info.menuItemId === "save-page") {
			await this.handleSavePage(info, tab);
		} else if (info.menuItemId === "save-link") {
			await this.handleSaveLink(info, tab);
		}
	}

	// Handle saving page
	private async handleSavePage(
		_info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) {
		if (!tab?.url || !tab?.id) return;

		// Don't save internal URLs like chrome://
		if (this.isInternalUrl(tab.url)) {
			return;
		}

		const title = tab.title || tab.url;

		try {
			await this.storage.addItem(tab.url, title);
			this.showSuccessBadge(tab.id);
		} catch (error) {
			console.error("Failed to save page:", error);
			this.showErrorBadge(tab.id);
		}
	}

	// Handle saving link
	private async handleSaveLink(
		info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) {
		if (!info.linkUrl || !tab?.id) return;

		// Don't save dangerous URLs
		if (this.isInternalUrl(info.linkUrl) || this.isDangerousUrl(info.linkUrl)) {
			return;
		}

		// For links, use URL as title since title is not available
		const title = info.linkUrl;

		try {
			await this.storage.addItem(info.linkUrl, title);
			this.showSuccessBadge(tab.id);
		} catch (error) {
			console.error("Failed to save link:", error);
			this.showErrorBadge(tab.id);
		}
	}

	// Check if URL is internal
	private isInternalUrl(url: string): boolean {
		return (
			url.startsWith("chrome://") ||
			url.startsWith("chrome-extension://") ||
			url.startsWith("about:") ||
			url.startsWith("edge://") ||
			url.startsWith("brave://")
		);
	}

	// Check if URL is dangerous
	private isDangerousUrl(url: string): boolean {
		return url.startsWith("javascript:") || url.startsWith("data:");
	}

	// Show success badge
	private showSuccessBadge(tabId: number) {
		chrome.action.setBadgeText({ text: "✓", tabId });
		chrome.action.setBadgeBackgroundColor({ color: "#16a34a", tabId });

		// Clear badge after 3 seconds
		setTimeout(() => {
			chrome.action.setBadgeText({ text: "", tabId });
		}, 3000);
	}

	// Show error badge
	private showErrorBadge(tabId: number) {
		chrome.action.setBadgeText({ text: "!", tabId });
		chrome.action.setBadgeBackgroundColor({ color: "#dc2626", tabId });

		// Clear badge after 3 seconds
		setTimeout(() => {
			chrome.action.setBadgeText({ text: "", tabId });
		}, 3000);
	}

	// Message handling (for future extension)
	handleMessage(
		_request: unknown,
		_sender: chrome.runtime.MessageSender,
		_sendResponse: (response: unknown) => void,
	): boolean {
		// Use when communication with content script is needed in the future
		return true;
	}

	// Get storage instance (as needed)
	getStorage() {
		return this.storage;
	}
}
