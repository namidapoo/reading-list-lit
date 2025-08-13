/// <reference types="vitest/config" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	base: "./",
	publicDir: false,
	build: {
		outDir: "dist",
		minify: "esbuild",
		target: "esnext",
		sourcemap: false,
		rollupOptions: {
			input: {
				popup: resolve(__dirname, "extension/entries/popup.ts"),
				background: resolve(__dirname, "extension/entries/background.ts"),
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name]-[hash].js",
				assetFileNames: "[name].[ext]",
			},
		},
	},
	plugins: [
		viteStaticCopy({
			targets: [
				{ src: "extension/manifest.json", dest: "." },
				{ src: "extension/popup.html", dest: "." },
				{ src: "extension/icons/*", dest: "icons" },
			],
		}),
	],
	// テスト設定
	test: {
		browser: {
			enabled: true,
			provider: "playwright",
			instances: [{ browser: "chromium" }],
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		passWithNoTests: true,
	},
});
