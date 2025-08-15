import { cleanupTestContainer, createTestContainer } from "@test-utils/helpers";
import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	circlePlusIcon,
	earthIcon,
	octagonAlertIcon,
	searchIcon,
	trashIcon,
	xIcon,
} from "./icons";

describe("Icons", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = createTestContainer();
	});

	afterEach(() => {
		cleanupTestContainer(container);
	});

	describe("circlePlusIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			render(circlePlusIcon(), container);
			const svg = container.querySelector("svg");
			expect(svg).toBeDefined();

			const circle = svg?.querySelector("circle");
			expect(circle?.getAttribute("fill")).toBe("#3EA8FF");

			const paths = svg?.querySelectorAll("path");
			expect(paths?.[0]?.getAttribute("stroke")).toBe("#fff");
			expect(paths?.[1]?.getAttribute("stroke")).toBe("#fff");
		});

		it("カスタム色を適用できる", () => {
			render(circlePlusIcon("#FF0000", "#00FF00"), container);
			const svg = container.querySelector("svg");

			const circle = svg?.querySelector("circle");
			expect(circle?.getAttribute("fill")).toBe("#FF0000");

			const paths = svg?.querySelectorAll("path");
			expect(paths?.[0]?.getAttribute("stroke")).toBe("#00FF00");
			expect(paths?.[1]?.getAttribute("stroke")).toBe("#00FF00");
		});
	});

	describe("earthIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			render(earthIcon(), container);
			const svg = container.querySelector("svg");
			expect(svg).toBeDefined();
			expect(svg?.getAttribute("stroke")).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			render(earthIcon("#FF0000"), container);
			const svg = container.querySelector("svg");
			expect(svg?.getAttribute("stroke")).toBe("#FF0000");
		});
	});

	describe("octagonAlertIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			render(octagonAlertIcon(), container);
			const svg = container.querySelector("svg");
			expect(svg).toBeDefined();
			expect(svg?.getAttribute("stroke")).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			render(octagonAlertIcon("#00FF00"), container);
			const svg = container.querySelector("svg");
			expect(svg?.getAttribute("stroke")).toBe("#00FF00");
		});
	});

	describe("searchIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			render(searchIcon(), container);
			const svg = container.querySelector("svg");
			expect(svg).toBeDefined();
			expect(svg?.getAttribute("stroke")).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			render(searchIcon("#0000FF"), container);
			const svg = container.querySelector("svg");
			expect(svg?.getAttribute("stroke")).toBe("#0000FF");
		});
	});

	describe("trashIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			render(trashIcon(), container);
			const svg = container.querySelector("svg");
			expect(svg).toBeDefined();
			expect(svg?.getAttribute("stroke")).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			render(trashIcon("#FF00FF"), container);
			const svg = container.querySelector("svg");
			expect(svg?.getAttribute("stroke")).toBe("#FF00FF");
		});
	});

	describe("xIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			render(xIcon(), container);
			const svg = container.querySelector("svg");
			expect(svg).toBeDefined();
			expect(svg?.getAttribute("stroke")).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			render(xIcon("#00FFFF"), container);
			const svg = container.querySelector("svg");
			expect(svg?.getAttribute("stroke")).toBe("#00FFFF");
		});
	});

	describe("全アイコン共通", () => {
		it("すべてのアイコンがSVG要素を描画する", () => {
			const icons = [
				circlePlusIcon(),
				earthIcon(),
				octagonAlertIcon(),
				searchIcon(),
				trashIcon(),
				xIcon(),
			];

			for (const icon of icons) {
				const tempContainer = document.createElement("div");
				render(icon, tempContainer);
				const svg = tempContainer.querySelector("svg");
				expect(svg).toBeDefined();
				expect(svg?.tagName).toBe("svg");
			}
		});

		it("すべてのアイコンがaria-hidden属性を持つ", () => {
			const icons = [
				circlePlusIcon(),
				earthIcon(),
				octagonAlertIcon(),
				searchIcon(),
				trashIcon(),
				xIcon(),
			];

			for (const icon of icons) {
				const tempContainer = document.createElement("div");
				render(icon, tempContainer);
				const svg = tempContainer.querySelector("svg");
				expect(svg?.getAttribute("aria-hidden")).toBe("true");
			}
		});
	});
});
