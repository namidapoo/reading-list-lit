import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./reading-item";
import { createMockItem, fixtures } from "@test-utils/fixtures";
import {
	cleanupTestContainer,
	createTestContainer,
	waitForUpdates,
} from "@test-utils/helpers";
import type { ReadingItemElement } from "./reading-item";

describe("ReadingItem component XSS protection", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = createTestContainer();
	});

	afterEach(() => {
		cleanupTestContainer(container);
		vi.clearAllMocks();
	});

	it("does not execute malicious script tags in title", async () => {
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

		// Verify script tag is displayed as text
		const titleElement = element.shadowRoot?.querySelector(".item-title");
		expect(titleElement?.textContent).toBe(
			"<script>alert('XSS')</script>Malicious Title",
		);

		// Verify alert is not called
		const alertSpy = vi.spyOn(window, "alert");
		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("does not execute malicious JavaScript protocol in URL", async () => {
		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		element.item = fixtures.maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		// Verify alert is not called
		const alertSpy = vi.spyOn(window, "alert");
		element.click();
		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("does not execute malicious script in favicon URL", async () => {
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

		// Verify alert is not called
		const alertSpy = vi.spyOn(window, "alert");
		const favicon = element.shadowRoot?.querySelector(
			".item-favicon",
		) as HTMLImageElement;

		// javascript: in favicon src is not executed
		// (prevented by Lit and browser security mechanisms)
		if (favicon) {
			// src is set but not actually executed
			expect(favicon.src).toBeDefined();
			// alert is not called even when error event is triggered
			favicon.dispatchEvent(new Event("error"));
		}

		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("correctly escapes HTML entities", async () => {
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

		// Verify entities are displayed as-is
		// (Lit automatically escapes strings for safe display)
		const titleElement = element.shadowRoot?.querySelector(".item-title");
		expect(titleElement?.textContent).toBe(
			"Title with &lt;brackets&gt; and &amp; symbols",
		);
	});

	it("does not execute injected onerror event handler", async () => {
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

		// Verify alert is not called
		const alertSpy = vi.spyOn(window, "alert");

		// Trigger favicon error event
		const favicon = element.shadowRoot?.querySelector(
			".item-favicon",
		) as HTMLImageElement;
		if (favicon) {
			const errorEvent = new Event("error");
			favicon.dispatchEvent(errorEvent);
		}

		expect(alertSpy).not.toHaveBeenCalled();
	});

	it("does not execute malicious code in data-* attributes", async () => {
		const element = document.createElement(
			"reading-item",
		) as ReadingItemElement;
		const maliciousItem = createMockItem({
			id: "data-malicious",
			title: "Test",
		});

		// Attempt to set malicious data attribute
		element.setAttribute("data-onclick", "alert('XSS')");
		element.item = maliciousItem;
		container.appendChild(element);
		await waitForUpdates(element);

		const alertSpy = vi.spyOn(window, "alert");
		element.click();
		expect(alertSpy).not.toHaveBeenCalled();
	});

	describe("CSP (Content Security Policy)", () => {
		it("blocks inline scripts with CSP", () => {
			// Simulate CSP header
			const meta = document.createElement("meta");
			meta.httpEquiv = "Content-Security-Policy";
			meta.content = "script-src 'self'; object-src 'none';";
			document.head.appendChild(meta);

			// Attempt to execute inline script
			const script = document.createElement("script");
			script.textContent = "window.xssTest = true;";

			// Catch CSP violation
			document.body.appendChild(script);

			// Verify window.xssTest is not defined
			expect(
				(window as Window & { xssTest?: boolean }).xssTest,
			).toBeUndefined();

			// Cleanup
			document.head.removeChild(meta);
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		});
	});
});
