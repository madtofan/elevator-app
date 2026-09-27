import { gpioHistory } from "@elevator-app/db/schema/history";
import { afterEach, expect, it } from "vitest";

import { resetTestData, testDb } from "../db";

afterEach(() => {
	resetTestData();
});

it("applies the gpio_history migration with an ISO 8601 default timestamp", async () => {
	await testDb.insert(gpioHistory).values({ pin: 17, state: 1 });

	const rows = await testDb.select().from(gpioHistory);

	expect(rows).toHaveLength(1);
	expect(rows[0]?.pin).toBe(17);
	expect(rows[0]?.state).toBe(1);
	expect(rows[0]?.timestamp).toMatch(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
	);
});

it("rejects state values outside 0 and 1", async () => {
	const error = await testDb
		.insert(gpioHistory)
		.values({ pin: 17, state: 2 })
		.catch((caught: unknown) => caught);

	const cause = error instanceof Error ? error.cause : undefined;

	if (!(cause instanceof Error)) {
		throw new Error("expected the insert to fail with a wrapped cause");
	}

	expect(cause.message).toMatch(/CHECK constraint failed/);
});
