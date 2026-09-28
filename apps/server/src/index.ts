import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createApiHandler, createRpcHandler } from "./api-handlers";
import { createContextFactory } from "./context";
import { db, runMigrations } from "./db";
import { ENV } from "./env.server";
import { gpioBus } from "./gpio/bus";
import { createPinOutputPort, initGpioOutput } from "./gpio/output";
import { gpioRoutes } from "./gpio/sse";
import { initGpioWatcher } from "./gpio/watcher";
import { healthRoutes } from "./health";
import { auth } from "./services";
import { registerStaticRoutes } from "./static";

runMigrations();

// Non-fatal: the server still serves history when GPIO is unavailable (e.g. on
// development machines), unlike the migration fail-fast above.
await initGpioWatcher({ db });

const gpioOutput = await initGpioOutput();

const createContext = createContextFactory({
	pinOutput: createPinOutputPort(gpioOutput),
	publishPinChange: (event) => {
		gpioBus.emit("gpio-change", event);
	},
});

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: ENV.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.route("/api", healthRoutes);
app.route("/api/gpio", gpioRoutes);

app.on(["POST", "GET"], "/api/auth/*", async (c) => auth.handler(c.req.raw));

export const apiHandler = createApiHandler();

export const rpcHandler = createRpcHandler();

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context: context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/api-reference",
		context: context,
	});

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

registerStaticRoutes(app);

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
