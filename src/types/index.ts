export interface ReadingItem {
	id: string;
	url: string;
	title: string;
	faviconUrl?: string;
	addedAt: number;
}

export interface SavePageMessage {
	type: "SAVE_PAGE";
	url: string;
	title: string;
}

export const ErrorCode = {
	STORAGE_FULL: "STORAGE_FULL",
	INVALID_URL: "INVALID_URL",
	DUPLICATE_URL: "DUPLICATE_URL",
	NETWORK_ERROR: "NETWORK_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ReadingListError extends Error {
	code: ErrorCode;

	constructor(code: ErrorCode, message: string) {
		super(message);
		this.name = "ReadingListError";
		this.code = code;
	}
}
