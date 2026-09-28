import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

/** Paths owned by the API; unknown routes here must 404 instead of serving the SPA. */
const API_PATH_PREFIXES = ["/api/", "/rpc/"];

function isApiPath(path: string): boolean {
	return API_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Serves the built PWA from `distDir` (`./dist`, relative to the process
 * working directory, which is the release root in production) and falls back to
 * its `index.html` for client-side routes. Register after the API routes so
 * they take precedence; API misses stay 404s.
 */
export function registerStaticRoutes(app: Hono, distDir = "./dist"): void {
	app.use("/*", serveStatic({ root: distDir }));
	app.use("/*", async (c, next) => {
		const isReadRequest = c.req.method === "GET" || c.req.method === "HEAD";

		if (!isReadRequest || isApiPath(c.req.path)) {
			return next();
		}

		return serveStatic({ path: `${distDir}/index.html` })(c, next);
	});
}
