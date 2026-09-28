import { existsSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

/**
 * API namespaces; unknown routes under them must 404 instead of serving the
 * SPA. Segment boundaries keep `/api-reference` from being caught by `/api`
 * and lookalike paths such as `/apiary` from being treated as API paths.
 */
const API_PATH_PREFIXES = ["/api", "/rpc", "/api-reference"];

function isApiPath(path: string): boolean {
	return API_PATH_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`),
	);
}

/**
 * Serves the built PWA from `distDir` (`./dist`, relative to the process
 * working directory, which is the release root in production) and falls back to
 * its `index.html` for client-side routes. Register after the API routes so
 * they take precedence; API misses stay 404s.
 *
 * Registration is skipped when `distDir` has no `index.html`. Otherwise running
 * from `apps/server` would expose the server bundle (`index.mjs`, the copied
 * migrations) over HTTP, since `./dist` is the server build output there.
 */
export function registerStaticRoutes(app: Hono, distDir = "./dist"): void {
	const indexFile = join(distDir, "index.html");

	if (!existsSync(indexFile)) {
		console.warn(
			`[static] ${indexFile} not found, static file serving disabled`,
		);
		return;
	}

	app.use("/*", serveStatic({ root: distDir }));
	app.use("/*", async (c, next) => {
		const isReadRequest = c.req.method === "GET" || c.req.method === "HEAD";

		if (!isReadRequest || isApiPath(c.req.path)) {
			return next();
		}

		return serveStatic({ path: indexFile })(c, next);
	});
}
