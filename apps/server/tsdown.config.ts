import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	deps: {
		alwaysBundle: [/@elevator-app\/.*/],
		neverBundle: ["better-sqlite3", "onoff"],
	},
});
