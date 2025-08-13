import { ReadingListStorage } from "./storage";

export class BackgroundService {
	private storage = new ReadingListStorage();

	// 拡張機能の初期化処理
	async initialize() {
		console.log("Reading List extension installed");
		this.createContextMenus();
	}

	// コンテキストメニューの作成
	private createContextMenus() {
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

	// コンテキストメニューのクリック処理
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

	// ページ保存処理
	private async handleSavePage(
		_info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) {
		if (!tab?.url || !tab?.id) return;

		// chrome:// などの内部URLは保存しない
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

	// リンク保存処理
	private async handleSaveLink(
		info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) {
		if (!info.linkUrl || !tab?.id) return;

		// 危険なURLは保存しない
		if (this.isInternalUrl(info.linkUrl) || this.isDangerousUrl(info.linkUrl)) {
			return;
		}

		// リンクの場合、タイトルは取得できないのでURLを使用
		const title = info.linkUrl;

		try {
			await this.storage.addItem(info.linkUrl, title);
			this.showSuccessBadge(tab.id);
		} catch (error) {
			console.error("Failed to save link:", error);
			this.showErrorBadge(tab.id);
		}
	}

	// 内部URLかどうかを判定
	private isInternalUrl(url: string): boolean {
		return (
			url.startsWith("chrome://") ||
			url.startsWith("chrome-extension://") ||
			url.startsWith("about:") ||
			url.startsWith("edge://") ||
			url.startsWith("brave://")
		);
	}

	// 危険なURLかどうかを判定
	private isDangerousUrl(url: string): boolean {
		return url.startsWith("javascript:") || url.startsWith("data:");
	}

	// 成功バッジを表示
	private showSuccessBadge(tabId: number) {
		chrome.action.setBadgeText({ text: "✓", tabId });
		chrome.action.setBadgeBackgroundColor({ color: "#16a34a", tabId });

		// 3秒後にバッジをクリア
		setTimeout(() => {
			chrome.action.setBadgeText({ text: "", tabId });
		}, 3000);
	}

	// エラーバッジを表示
	private showErrorBadge(tabId: number) {
		chrome.action.setBadgeText({ text: "!", tabId });
		chrome.action.setBadgeBackgroundColor({ color: "#dc2626", tabId });

		// 3秒後にバッジをクリア
		setTimeout(() => {
			chrome.action.setBadgeText({ text: "", tabId });
		}, 3000);
	}

	// メッセージハンドリング（将来拡張用）
	handleMessage(
		_request: unknown,
		_sender: chrome.runtime.MessageSender,
		_sendResponse: (response: unknown) => void,
	): boolean {
		// 将来的にcontent scriptとの通信が必要な場合に使用
		return true;
	}

	// ストレージインスタンスの取得（必要に応じて）
	getStorage() {
		return this.storage;
	}
}
