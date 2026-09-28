import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Hono } from "hono";
import { afterAll, beforeAll, expect, it } from "vitest";

import { registerStaticRoutes } from "../static";

let distDir = "";

beforeAll(async () => {
	distDir = await mkdtemp(join(tmpdir(), "elevator-static-"));
	await mkdir(join(distDir, "assets"));
	await writeFile(join(distDir, "index.html"), "<html>app</html>");
	await writeFile(join(distDir, "assets", "app.js"), "console.log('app')");
});

afterAll(async () => {
	await rm(distDir, { recursive: true, force: true });
});

function createApp(): Hono {
	const app = new Hono();

	registerStaticRoutes(app, distDir);

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

it("does not fall back to the SPA for unknown API routes", async () => {
	const app = createApp();

	expect((await app.request("/api/missing")).status).toBe(404);
	expect((await app.request("/rpc/missing")).status).toBe(404);
});

it("does not serve the SPA for non-GET requests", async () => {
	const response = await createApp().request("/dashboard", {
		method: "POST",
	});

	expect(response.status).toBe(404);
});
