/// <reference types="vitest/config" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				popup: resolve(__dirname, "popup.html"),
				background: resolve(__dirname, "background.html"),
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
		},
		outDir: "dist",
		emptyOutDir: true,
	},
	test: {
		// Lit recommends using browser environment for testing
		// https://lit.dev/docs/tools/testing/#testing-in-the-browser
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
