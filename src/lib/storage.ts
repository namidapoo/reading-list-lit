import type { ReadingItem } from "../types";
import { ErrorCode, ReadingListError } from "../types";

const STORAGE_KEY = "items";
const MAX_ITEMS = 512;
const MAX_TITLE_LENGTH = 255;

export class ReadingListStorage {
	private cache: ReadingItem[] | null = null;
	private storageListener?: (changes: {
		[key: string]: chrome.storage.StorageChange;
	}) => void;

	constructor() {
		// ストレージ変更の監視
		this.storageListener = (changes) => {
			if (changes[STORAGE_KEY]) {
				this.cache = null; // キャッシュをクリア
			}
		};
		chrome.storage.sync.onChanged.addListener(this.storageListener);
	}

	async addItem(url: string, title: string): Promise<ReadingItem> {
		// URL検証
		if (!this.isValidUrl(url)) {
			throw new ReadingListError(ErrorCode.INVALID_URL, "Invalid URL");
		}

		// タイトルのサニタイズと切り詰め
		const sanitizedTitle = this.sanitizeTitle(title);

		// ソートされていない元のデータを取得
		const result = await chrome.storage.sync.get(STORAGE_KEY);
		const items: ReadingItem[] = result[STORAGE_KEY] || [];

		// 既存のアイテムをチェック（重複URL）
		const existingItemIndex = items.findIndex((item) => item.url === url);

		if (existingItemIndex !== -1) {
			// 重複URLの場合は更新
			items[existingItemIndex] = {
				...items[existingItemIndex],
				title: sanitizedTitle,
				addedAt: Date.now(),
			};
			await this.saveItems(items);
			return items[existingItemIndex];
		}

		// ストレージ制限チェック
		if (items.length >= MAX_ITEMS) {
			throw new ReadingListError(
				ErrorCode.STORAGE_FULL,
				"Storage limit reached",
			);
		}

		// 新規アイテム作成
		const newItem: ReadingItem = {
			id: this.generateId(),
			url,
			title: sanitizedTitle,
			faviconUrl: this.getFaviconUrl(url),
			addedAt: Date.now(),
		};

		items.push(newItem);
		await this.saveItems(items);

		return newItem;
	}

	async removeItem(id: string): Promise<void> {
		const items = await this.getItems();
		const filteredItems = items.filter((item) => item.id !== id);
		await this.saveItems(filteredItems);
	}

	async getItems(): Promise<ReadingItem[]> {
		if (this.cache) {
			return this.sortByAddedAt(this.cache);
		}

		try {
			const result = await chrome.storage.sync.get(STORAGE_KEY);
			const items = result[STORAGE_KEY] || [];
			this.cache = items;
			return this.sortByAddedAt(items);
		} catch (error) {
			console.error("Failed to get items from storage:", error);
			return [];
		}
	}

	async searchItems(query: string): Promise<ReadingItem[]> {
		const items = await this.getItems();

		if (!query) {
			return items;
		}

		const lowerQuery = query.toLowerCase();
		const filteredItems = items.filter(
			(item) =>
				item.title.toLowerCase().includes(lowerQuery) ||
				item.url.toLowerCase().includes(lowerQuery),
		);

		return this.sortByAddedAt(filteredItems);
	}

	async getItemCount(): Promise<number> {
		const items = await this.getItems();
		return items.length;
	}

	private async saveItems(items: ReadingItem[]): Promise<void> {
		try {
			await chrome.storage.sync.set({ [STORAGE_KEY]: items });
			this.cache = items;
		} catch (error) {
			console.error("Failed to save items to storage:", error);
			throw new ReadingListError(
				ErrorCode.UNKNOWN_ERROR,
				"Failed to save items",
			);
		}
	}

	private isValidUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			// javascriptプロトコルなどの危険なURLを拒否
			if (!["http:", "https:"].includes(parsed.protocol)) {
				return false;
			}
			return true;
		} catch {
			return false;
		}
	}

	private sanitizeTitle(title: string): string {
		// HTMLタグを除去し、文字数制限を適用
		const sanitized = title.replace(/<[^>]*>/g, "").trim();
		return sanitized.length > MAX_TITLE_LENGTH
			? sanitized.substring(0, MAX_TITLE_LENGTH)
			: sanitized;
	}

	private getFaviconUrl(url: string): string {
		try {
			const parsed = new URL(url);
			// DuckDuckGo favicon API
			return `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`;
		} catch {
			return "";
		}
	}

	private generateId(): string {
		return `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	private sortByAddedAt(items: ReadingItem[]): ReadingItem[] {
		return [...items].sort((a, b) => b.addedAt - a.addedAt);
	}

	cleanup() {
		// リスナーを削除してメモリリークを防ぐ
		if (this.storageListener) {
			chrome.storage.sync.onChanged.removeListener(this.storageListener);
			this.storageListener = undefined;
		}
		this.cache = null;
	}
}
