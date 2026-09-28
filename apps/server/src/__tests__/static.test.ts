import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Hono } from "hono";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";

import { registerStaticRoutes } from "../static";

let distDir = "";
let bundleDir = "";

beforeAll(async () => {
	distDir = await mkdtemp(join(tmpdir(), "elevator-static-"));
	await mkdir(join(distDir, "assets"));
	await writeFile(join(distDir, "index.html"), "<html>app</html>");
	await writeFile(join(distDir, "assets", "app.js"), "console.log('app')");

	// Mimics `apps/server/dist`: a server bundle without a web index.html.
	bundleDir = await mkdtemp(join(tmpdir(), "elevator-bundle-"));
	await writeFile(join(bundleDir, "index.mjs"), "export const server = true;");
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await Promise.all([
		rm(distDir, { recursive: true, force: true }),
		rm(bundleDir, { recursive: true, force: true }),
	]);
});

function createApp(dir = distDir): Hono {
	const app = new Hono();

	registerStaticRoutes(app, dir);

	return app;
}

it("serves the index for the root and client-side routes", async () => {
	const app = createApp();

	for (const path of ["/", "/dashboard", "/history/2026"]) {
		const response = await app.request(path);

		expect(response.status, path).toBe(200);
		expect(await response.text(), path).toBe("<html>app</html>");
	}
});

it("serves built assets from the dist directory", async () => {
	const response = await createApp().request("/assets/app.js");

	expect(response.status).toBe(200);
	expect(await response.text()).toBe("console.log('app')");
});

it("does not fall back to the SPA for API namespaces", async () => {
	const app = createApp();

	for (const path of [
		"/api/missing",
		"/api",
		"/rpc/missing",
		"/rpc",
		"/api-reference/missing",
	]) {
		expect((await app.request(path)).status, path).toBe(404);
	}
});

it("does not mistake lookalike paths for the API", async () => {
	const response = await createApp().request("/apiary/api");

	expect(response.status).toBe(200);
	expect(await response.text()).toBe("<html>app</html>");
});

it("does not serve the SPA for non-GET requests", async () => {
	const response = await createApp().request("/dashboard", {
		method: "POST",
	});

	expect(response.status).toBe(404);
});

it("disables static serving when the dist directory has no index.html", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);
	const app = createApp(bundleDir);

	expect((await app.request("/index.mjs")).status).toBe(404);
	expect((await app.request("/")).status).toBe(404);
	expect(consoleWarn).toHaveBeenCalledTimes(1);
});
