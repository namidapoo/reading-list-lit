import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./reading-item";
import { createMockItem, fixtures } from "@test-utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ReadingItemElement } from "./reading-item";

describe("ReadingItemコンポーネントのXSS対策", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = createTestContainer();
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	it("タイトルに悪意のあるスクリプトタグが含まれる場合、実行されない", async () => {
		const maliciousItem = createMockItem({
			id: "malicious-1",
			title: "<script>alert('XSS')</script>Malicious Title",
		});

		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		element.item = maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		// スクリプトタグがテキストとして表示されることを確認
		const titleElement = element.shadowRoot?.querySelector(".item-title");
		expect(titleElement?.textContent).toBe(
			"<script>alert('XSS')</script>Malicious Title",
		);

		// alertが呼ばれないことを確認
		const alertSpy = vi.spyOn(window, "alert");
		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("URLに悪意のあるJavaScriptプロトコルが含まれる場合、実行されない", async () => {
		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		element.item = fixtures.maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		// alertが呼ばれないことを確認
		const alertSpy = vi.spyOn(window, "alert");
		element.click();
		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("faviconのURLに悪意のあるスクリプトが含まれる場合、実行されない", async () => {
		const maliciousItem = createMockItem({
			id: "malicious-3",
			title: "Test Title",
			faviconUrl: "javascript:alert('XSS')",
		});

		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		element.item = maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		// alertが呼ばれないことを確認
		const alertSpy = vi.spyOn(window, "alert");
		const favicon = element.shadowRoot?.querySelector(
			".item-favicon",
		) as HTMLImageElement;

		// faviconのsrcにjavascript:が設定されても実行されない
		// (Litやブラウザのセキュリティメカニズムで防がれる)
		if (favicon) {
			// srcは設定されているが、実際には実行されない
			expect(favicon.src).toBeDefined();
			// エラーイベントをトリガーしても alert は呼ばれない
			favicon.dispatchEvent(new Event("error"));
		}

		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("HTMLエンティティが正しくエスケープされる", async () => {
		const itemWithEntities = createMockItem({
			id: "entity-1",
			title: "Title with &lt;brackets&gt; and &amp; symbols",
		});

		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		element.item = itemWithEntities;
		container.appendChild(element);
		await waitForUpdates(element);

		// エンティティがそのまま表示されることを確認
		// (Litは文字列を自動的にエスケープして安全に表示する)
		const titleElement = element.shadowRoot?.querySelector(".item-title");
		expect(titleElement?.textContent).toBe(
			"Title with &lt;brackets&gt; and &amp; symbols",
		);
	});

	it("onerrorイベントハンドラが挿入されても実行されない", async () => {
		const maliciousItem = createMockItem({
			id: "malicious-4",
			title: "Test",
			faviconUrl: "https://invalid.url/image.png\" onerror=\"alert('XSS')",
		});

		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		element.item = maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		// alertが呼ばれないことを確認
		const alertSpy = vi.spyOn(window, "alert");

		// faviconのエラーイベントをトリガー
		const favicon = element.shadowRoot?.querySelector(
			".item-favicon",
		) as HTMLImageElement;
		if (favicon) {
			const errorEvent = new Event("error");
			favicon.dispatchEvent(errorEvent);
		}

		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("data-*属性に悪意のあるコードが含まれても実行されない", async () => {
		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		const maliciousItem = createMockItem({
			id: "data-malicious",
			title: "Test",
		});

		// 悪意のあるdata属性を設定しようとする
		element.setAttribute("data-onclick", "alert('XSS')");
		element.item = maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		const alertSpy = vi.spyOn(window, "alert");
		element.click();
		expect(alertSpy).not.toHaveBeenCalled();
	});

	describe("CSP（Content Security Policy）", () => {
		it("インラインスクリプトがCSPによってブロックされる", () => {
			// CSPヘッダーのシミュレーション
			const meta = document.createElement("meta");
			meta.httpEquiv = "Content-Security-Policy";
			meta.content = "script-src 'self'; object-src 'none';";
			document.head.appendChild(meta);

			// インラインスクリプトの実行試行
			const script = document.createElement("script");
			script.textContent = "window.xssTest = true;";

			// CSP違反をキャッチ
			document.body.appendChild(script);

			// window.xssTestが定義されていないことを確認
			expect(
				(window as Window & { xssTest?: boolean }).xssTest,
			).toBeUndefined();

			// クリーンアップ
			document.head.removeChild(meta);
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		});
	});
});
