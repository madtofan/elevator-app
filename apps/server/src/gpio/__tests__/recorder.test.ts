import { gpioHistory } from "@elevator-app/db/schema/history";
import { afterEach, expect, it, vi } from "vitest";

import { createTestDb } from "../../test/db";
import { type GpioChangeEvent, type GpioState, gpioBus } from "../bus";
import { recordGpioChange } from "../recorder";

const TIMESTAMP = "2026-09-27T12:00:00.000Z";

afterEach(() => {
	gpioBus.removeAllListeners("gpio-change");
});

it("persists the edge and emits it on the bus", async () => {
	const db = createTestDb();
	const listener = vi.fn<(event: GpioChangeEvent) => void>();
	gpioBus.on("gpio-change", listener);

	const event: GpioChangeEvent = { pin: 17, state: 1, timestamp: TIMESTAMP };
	recordGpioChange(db, event);

	const rows = await db.select().from(gpioHistory);

	expect(rows).toEqual([{ id: 1, ...event }]);
	expect(listener).toHaveBeenCalledExactlyOnceWith(event);
});

it("does not emit when the insert fails", () => {
	const db = createTestDb();
	const listener = vi.fn();
	gpioBus.on("gpio-change", listener);

	expect(() =>
		recordGpioChange(db, {
			pin: 17,
			state: 2 as unknown as GpioState,
			timestamp: TIMESTAMP,
		}),
	).toThrow();

	expect(listener).not.toHaveBeenCalled();
});
