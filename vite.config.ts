/// <reference types="vitest/config" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
	const isBackground = process.env.BUILD_TARGET === "background";
	const isProduction = mode === "production";

	// 共通設定
	const common = {
		base: "./",
		build: {
			outDir: "dist",
			emptyOutDir: !isBackground, // backgroundビルド時はクリアしない
			minify: isProduction ? ("esbuild" as const) : false,
			target: "esnext",
			sourcemap: !isProduction,
		},
		esbuild: isProduction
			? {
					drop: ["console" as const, "debugger" as const],
				}
			: undefined,
	};

	// background用の設定
	if (isBackground) {
		return {
			...common,
			build: {
				...common.build,
				lib: {
					entry: resolve(__dirname, "src/background.ts"),
					name: "background",
					formats: ["iife"],
					fileName: () => "background.js",
				},
				rollupOptions: {
					output: {
						inlineDynamicImports: true,
					},
				},
			},
		};
	}

	// popup用の設定
	return {
		...common,
		build: {
			...common.build,
			rollupOptions: {
				input: {
					popup: resolve(__dirname, "popup.html"),
				},
				output: {
					entryFileNames: "[name].js",
					chunkFileNames: "[name]-[hash].js",
					assetFileNames: "[name].[ext]",
					manualChunks: {
						// Litフレームワークを別チャンクに分離
						vendor: ["lit", "lit/decorators.js"],
					},
				},
			},
			// ポリフィルを無効化してサイズ削減
			modulePreload: {
				polyfill: false,
			},
		},
		// 開発サーバーの設定
		server:
			command === "serve"
				? {
						port: 3000,
						open: false,
					}
				: undefined,
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
	};
});
