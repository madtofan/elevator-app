import { gpioHistory } from "@elevator-app/db/schema/history";
import { afterEach, expect, it } from "vitest";

import { GPIO_INPUT_PIN, GPIO_OUTPUT_PIN } from "../../../gpio";
import { resetTestData, testDb } from "../../../test/db";
import { getPinStateService } from "../handlers/get-state";

afterEach(() => {
	resetTestData();
});

it("defaults to off when the output pin has no history", async () => {
	const state = await getPinStateService(testDb);

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 0,
		timestamp: null,
	});
});

it("returns the latest output state and ignores input transitions", async () => {
	await testDb.insert(gpioHistory).values([
		{ pin: GPIO_INPUT_PIN, state: 1, timestamp: "2026-09-27T10:00:00.000Z" },
		{ pin: GPIO_OUTPUT_PIN, state: 0, timestamp: "2026-09-27T11:00:00.000Z" },
		{ pin: GPIO_OUTPUT_PIN, state: 1, timestamp: "2026-09-27T12:00:00.000Z" },
	]);

	const state = await getPinStateService(testDb);

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 1,
		timestamp: "2026-09-27T12:00:00.000Z",
	});
});

it("prefers the live hardware state over the recorded state", async () => {
	await testDb.insert(gpioHistory).values({
		pin: GPIO_OUTPUT_PIN,
		state: 0,
		timestamp: "2026-09-27T12:00:00.000Z",
	});

	const state = await getPinStateService(testDb, {
		read: () => 1,
		write: () => true,
	});

	expect(state.state).toBe(1);
	expect(state.timestamp).toBe("2026-09-27T12:00:00.000Z");
});
