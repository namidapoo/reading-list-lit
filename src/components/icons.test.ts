import { describe, expect, it } from "vitest";
import {
	circlePlusIcon,
	earthIcon,
	octagonAlertIcon,
	searchIcon,
	trashIcon,
	xIcon,
} from "./icons";

describe("Icons", () => {
	describe("circlePlusIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			const result = circlePlusIcon();
			expect(result).toBeDefined();
			expect(result.strings).toBeDefined();
			expect(result.values).toHaveLength(3); // fillColor once, strokeColor twice
			expect(result.values[0]).toBe("#3EA8FF");
			expect(result.values[1]).toBe("#fff");
			expect(result.values[2]).toBe("#fff");
		});

		it("カスタム色を適用できる", () => {
			const result = circlePlusIcon("#FF0000", "#00FF00");
			expect(result.values[0]).toBe("#FF0000");
			expect(result.values[1]).toBe("#00FF00");
			expect(result.values[2]).toBe("#00FF00");
		});
	});

	describe("earthIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			const result = earthIcon();
			expect(result).toBeDefined();
			expect(result.strings).toBeDefined();
			expect(result.values).toHaveLength(1);
			expect(result.values[0]).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			const result = earthIcon("#FF0000");
			expect(result.values[0]).toBe("#FF0000");
		});
	});

	describe("octagonAlertIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			const result = octagonAlertIcon();
			expect(result).toBeDefined();
			expect(result.strings).toBeDefined();
			expect(result.values).toHaveLength(1);
			expect(result.values[0]).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			const result = octagonAlertIcon("#00FF00");
			expect(result.values[0]).toBe("#00FF00");
		});
	});

	describe("searchIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			const result = searchIcon();
			expect(result).toBeDefined();
			expect(result.strings).toBeDefined();
			expect(result.values).toHaveLength(1);
			expect(result.values[0]).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			const result = searchIcon("#0000FF");
			expect(result.values[0]).toBe("#0000FF");
		});
	});

	describe("trashIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			const result = trashIcon();
			expect(result).toBeDefined();
			expect(result.strings).toBeDefined();
			expect(result.values).toHaveLength(1);
			expect(result.values[0]).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			const result = trashIcon("#FF00FF");
			expect(result.values[0]).toBe("#FF00FF");
		});
	});

	describe("xIcon", () => {
		it("デフォルトの色でSVGテンプレートを返す", () => {
			const result = xIcon();
			expect(result).toBeDefined();
			expect(result.strings).toBeDefined();
			expect(result.values).toHaveLength(1);
			expect(result.values[0]).toBe("currentColor");
		});

		it("カスタム色を適用できる", () => {
			const result = xIcon("#00FFFF");
			expect(result.values[0]).toBe("#00FFFF");
		});
	});

	describe("全アイコン共通", () => {
		it("すべてのアイコンがSVGテンプレートを返す", () => {
			const icons = [
				circlePlusIcon(),
				earthIcon(),
				octagonAlertIcon(),
				searchIcon(),
				trashIcon(),
				xIcon(),
			];

			for (const icon of icons) {
				expect(icon).toBeDefined();
				expect(icon.strings).toBeDefined();
				expect(icon.strings.length).toBeGreaterThan(0);
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
				const svg = icon.strings.join("");
				expect(svg).toContain('aria-hidden="true"');
			}
		});
	});
});
