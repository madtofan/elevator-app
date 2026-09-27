import { Hono } from "hono";
import { afterEach, expect, it, vi } from "vitest";

import { type GpioChangeEvent, gpioBus } from "../bus";
import { gpioRoutes } from "../sse";

const app = new Hono().route("/api/gpio", gpioRoutes);
const decoder = new TextDecoder();

let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

afterEach(async () => {
	await activeReader?.cancel();
	activeReader = null;
	gpioBus.removeAllListeners("gpio-change");
	vi.useRealTimers();
});

async function connect(): Promise<ReadableStreamDefaultReader<Uint8Array>> {
	const response = await app.request("/api/gpio/sse");

	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toContain("text/event-stream");

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("expected the SSE response to stream a body");
	}
	activeReader = reader;
	return reader;
}

async function readFrame(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
	const { value } = await reader.read();
	if (!value) {
		throw new Error("expected an SSE frame");
	}
	return decoder.decode(value);
}

it("sends a connected frame and forwards gpio-change events", async () => {
	const reader = await connect();

	expect(await readFrame(reader)).toContain("event: connected");

	const payload: GpioChangeEvent = {
		pin: 17,
		state: 1,
		timestamp: "2026-09-27T12:00:00.000Z",
	};
	gpioBus.emit("gpio-change", payload);

	const frame = await readFrame(reader);

	expect(frame).toContain("event: gpio-change");
	expect(frame).toContain(`data: ${JSON.stringify(payload)}`);
});

it("pings every 15 seconds", async () => {
	vi.useFakeTimers();
	const reader = await connect();
	await readFrame(reader);

	await vi.advanceTimersByTimeAsync(15_000);

	expect(await readFrame(reader)).toContain("event: ping");
});

it("removes the bus listener when the client disconnects", async () => {
	const reader = await connect();
	await readFrame(reader);

	expect(gpioBus.listenerCount("gpio-change")).toBe(1);

	await reader.cancel();
	activeReader = null;

	expect(gpioBus.listenerCount("gpio-change")).toBe(0);
});
