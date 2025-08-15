import { BackgroundService } from "@lib/background-service";

const backgroundService = new BackgroundService();

// Extension install/update handler
chrome.runtime.onInstalled.addListener(() => {
	backgroundService.initialize();
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	await backgroundService.handleContextMenuClick(info, tab);
});

// Message handler (as needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	return backgroundService.handleMessage(request, sender, sendResponse);
});

// Export storage instance (for compatibility with existing code)
export const storage = backgroundService.getStorage();
