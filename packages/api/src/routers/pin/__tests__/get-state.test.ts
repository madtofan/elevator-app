import { gpioHistory } from "@elevator-app/db/schema/history";
import { afterEach, expect, it } from "vitest";

import { GPIO_INPUT_PIN, GPIO_OUTPUT_PIN } from "../../../gpio";
import { resetTestData, testDb } from "../../../test/db";
import { getPinStateService } from "../handlers/get-state";

const RECORDED_AT = "2026-09-27T12:00:00.000Z";

afterEach(() => {
	resetTestData();
});

it("defaults to off when the output pin has no history", () => {
	const state = getPinStateService(testDb);

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 0,
		timestamp: null,
	});
});

it("returns the latest output state and ignores input transitions", () => {
	testDb
		.insert(gpioHistory)
		.values([
			{ pin: GPIO_INPUT_PIN, state: 1, timestamp: "2026-09-27T10:00:00.000Z" },
			{ pin: GPIO_OUTPUT_PIN, state: 0, timestamp: "2026-09-27T11:00:00.000Z" },
			{ pin: GPIO_OUTPUT_PIN, state: 1, timestamp: RECORDED_AT },
		])
		.run();

	const state = getPinStateService(testDb);

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 1,
		timestamp: RECORDED_AT,
	});
});

it("keeps the recorded timestamp while the live state agrees", () => {
	testDb
		.insert(gpioHistory)
		.values({ pin: GPIO_OUTPUT_PIN, state: 1, timestamp: RECORDED_AT })
		.run();

	const state = getPinStateService(testDb, {
		read: () => 1,
		write: () => true,
	});

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 1,
		timestamp: RECORDED_AT,
	});
});

it("prefers the live hardware state and clears the stale timestamp", () => {
	testDb
		.insert(gpioHistory)
		.values({ pin: GPIO_OUTPUT_PIN, state: 1, timestamp: RECORDED_AT })
		.run();

	// E.g. the Pi restarted and forced the pin LOW after the recorded 1.
	const state = getPinStateService(testDb, {
		read: () => 0,
		write: () => true,
	});

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 0,
		timestamp: null,
	});
});

it("falls back to the recorded transition when the live read is unavailable", () => {
	testDb
		.insert(gpioHistory)
		.values({ pin: GPIO_OUTPUT_PIN, state: 1, timestamp: RECORDED_AT })
		.run();

	const state = getPinStateService(testDb, {
		read: () => null,
		write: () => true,
	});

	expect(state).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 1,
		timestamp: RECORDED_AT,
	});
});
