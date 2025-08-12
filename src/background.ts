import { ReadingListStorage } from "./storage";

const storage = new ReadingListStorage();

// 拡張機能のインストール/更新時の処理
chrome.runtime.onInstalled.addListener(() => {
	console.log("Reading List extension installed");

	// コンテキストメニューを作成
	createContextMenus();
});

// コンテキストメニューの作成
function createContextMenus() {
	// ページ全体を保存するメニュー
	chrome.contextMenus.create({
		id: "save-page",
		title: "Save to Reading List",
		contexts: ["page"],
	});

	// リンクを保存するメニュー
	chrome.contextMenus.create({
		id: "save-link",
		title: "Save Link to Reading List",
		contexts: ["link"],
	});
}

// コンテキストメニューのクリックハンドラー
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === "save-page") {
		await handleSavePage(info, tab);
	} else if (info.menuItemId === "save-link") {
		await handleSaveLink(info, tab);
	}
});

// ページ保存処理
async function handleSavePage(
	_info: chrome.contextMenus.OnClickData,
	tab?: chrome.tabs.Tab,
) {
	if (!tab?.url || !tab?.id) return;

	// chrome:// などの内部URLは保存しない
	if (isInternalUrl(tab.url)) {
		return;
	}

	const title = tab.title || tab.url;

	try {
		await storage.addItem(tab.url, title);
		showSuccessBadge(tab.id);
	} catch (error) {
		console.error("Failed to save page:", error);
		showErrorBadge(tab.id);
	}
}

// リンク保存処理
async function handleSaveLink(
	info: chrome.contextMenus.OnClickData,
	tab?: chrome.tabs.Tab,
) {
	if (!info.linkUrl || !tab?.id) return;

	// 危険なURLは保存しない
	if (isInternalUrl(info.linkUrl) || isDangerousUrl(info.linkUrl)) {
		return;
	}

	// リンクの場合、タイトルは取得できないのでURLを使用
	const title = info.linkUrl;

	try {
		await storage.addItem(info.linkUrl, title);
		showSuccessBadge(tab.id);
	} catch (error) {
		console.error("Failed to save link:", error);
		showErrorBadge(tab.id);
	}
}

// 内部URLかどうかを判定
function isInternalUrl(url: string): boolean {
	return (
		url.startsWith("chrome://") ||
		url.startsWith("chrome-extension://") ||
		url.startsWith("about:") ||
		url.startsWith("edge://") ||
		url.startsWith("brave://")
	);
}

// 危険なURLかどうかを判定
function isDangerousUrl(url: string): boolean {
	return url.startsWith("javascript:") || url.startsWith("data:");
}

// 成功バッジを表示
function showSuccessBadge(tabId: number) {
	chrome.action.setBadgeText({ text: "✓", tabId });
	chrome.action.setBadgeBackgroundColor({ color: "#16a34a", tabId });

	// 3秒後にバッジをクリア
	setTimeout(() => {
		chrome.action.setBadgeText({ text: "", tabId });
	}, 3000);
}

// エラーバッジを表示
function showErrorBadge(tabId: number) {
	chrome.action.setBadgeText({ text: "!", tabId });
	chrome.action.setBadgeBackgroundColor({ color: "#dc2626", tabId });

	// 3秒後にバッジをクリア
	setTimeout(() => {
		chrome.action.setBadgeText({ text: "", tabId });
	}, 3000);
}

// メッセージハンドラー（必要に応じて）
chrome.runtime.onMessage.addListener((_request, _sender, _sendResponse) => {
	// 将来的にcontent scriptとの通信が必要な場合に使用
	return true;
});

export { storage };
