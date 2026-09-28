import { gpioHistory } from "@elevator-app/db/schema/history";
import { asc } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";

import type { GpioState } from "../../../gpio";
import { GPIO_OUTPUT_PIN } from "../../../gpio";
import { resetTestData, testDb } from "../../../test/db";
import { togglePinService } from "../handlers/toggle";

afterEach(() => {
	resetTestData();
});

it("flips the logical state, records it, and publishes the change", () => {
	const publishPinChange = vi.fn();

	const first = togglePinService(testDb, { publishPinChange });
	const second = togglePinService(testDb, { publishPinChange });

	expect(first.pin).toBe(GPIO_OUTPUT_PIN);
	expect(first.state).toBe(1);
	expect(second.state).toBe(0);
	expect(publishPinChange).toHaveBeenCalledTimes(2);
	expect(publishPinChange).toHaveBeenLastCalledWith(second);

	const rows = testDb
		.select()
		.from(gpioHistory)
		.orderBy(asc(gpioHistory.id))
		.all();

	expect(rows.map((row) => row.state)).toEqual([1, 0]);
});

it("writes the next state to the hardware output", () => {
	const write = vi.fn<(state: GpioState) => boolean>(() => true);

	togglePinService(testDb, { pinOutput: { read: () => 0, write } });
	togglePinService(testDb, { pinOutput: { read: () => 1, write } });

	expect(write).toHaveBeenNthCalledWith(1, 1);
	expect(write).toHaveBeenNthCalledWith(2, 0);
});

it("still records and publishes when the hardware write fails", () => {
	const publishPinChange = vi.fn();

	const event = togglePinService(testDb, {
		pinOutput: { read: () => null, write: () => false },
		publishPinChange,
	});

	expect(event.state).toBe(1);

	const rows = testDb.select().from(gpioHistory).all();

	expect(rows).toHaveLength(1);
	expect(publishPinChange).toHaveBeenCalledWith(event);
});
