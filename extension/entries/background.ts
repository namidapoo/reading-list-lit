import { BackgroundService } from "../../src/lib/background-service";

const backgroundService = new BackgroundService();

// 拡張機能のインストール/更新時の処理
chrome.runtime.onInstalled.addListener(() => {
	backgroundService.initialize();
});

// コンテキストメニューのクリックハンドラー
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	await backgroundService.handleContextMenuClick(info, tab);
});

// メッセージハンドラー（必要に応じて）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	return backgroundService.handleMessage(request, sender, sendResponse);
});

// ストレージインスタンスをエクスポート（既存コードとの互換性のため）
export const storage = backgroundService.getStorage();
