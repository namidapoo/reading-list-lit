import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
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
		outDir: "dist",
		emptyOutDir: false,
		minify: false,
		// Service Workerで不要なコードを含めない
		modulePreload: {
			polyfill: false,
		},
	},
});
