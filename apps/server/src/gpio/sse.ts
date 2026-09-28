import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { GPIO_INPUT_PIN, type GpioChangeEvent, gpioBus } from "./bus";

const HEARTBEAT_INTERVAL_MS = 15_000;
const RECONNECT_DELAY_MS = 3_000;

export const gpioRoutes = new Hono();

gpioRoutes.get("/sse", (c) =>
	streamSSE(c, async (stream) => {
		const onGpioChange = (event: GpioChangeEvent) => {
			void stream.writeSSE({
				event: "gpio-change",
				data: JSON.stringify(event),
			});
		};

		gpioBus.on("gpio-change", onGpioChange);

		const heartbeat = setInterval(() => {
			void stream.writeSSE({
				event: "ping",
				data: new Date().toISOString(),
			});
		}, HEARTBEAT_INTERVAL_MS);

		// streamSSE closes the response as soon as this callback resolves, so it
		// stays pending until the client disconnects.
		const disconnected = new Promise<void>((resolve) => {
			stream.onAbort(() => {
				clearInterval(heartbeat);
				gpioBus.off("gpio-change", onGpioChange);
				resolve();
			});
		});

		await stream.writeSSE({
			event: "connected",
			data: JSON.stringify({ pin: GPIO_INPUT_PIN }),
			retry: RECONNECT_DELAY_MS,
		});

		await disconnected;
	}),
);
