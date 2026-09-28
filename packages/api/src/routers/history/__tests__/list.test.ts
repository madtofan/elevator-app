import { gpioHistory } from "@elevator-app/db/schema/history";
import { afterEach, expect, it } from "vitest";

import { resetTestData, testDb } from "../../../test/db";
import { getHistoryService } from "../handlers/list";

afterEach(() => {
	resetTestData();
});

async function seed(count: number): Promise<string[]> {
	const timestamps = Array.from({ length: count }, (_, index) =>
		new Date(Date.UTC(2026, 8, 27, 12, 0, index)).toISOString(),
	);

	await testDb.insert(gpioHistory).values(
		timestamps.map((timestamp, index) => ({
			pin: 27,
			state: index % 2 === 0 ? 0 : 1,
			timestamp,
		})),
	);

	return timestamps;
}

it("returns an empty page when there is no history", async () => {
	const page = await getHistoryService(testDb, { limit: 20, offset: 0 });

	expect(page).toEqual({ items: [], hasMore: false });
});

it("returns the newest transitions first", async () => {
	const timestamps = await seed(3);

	const page = await getHistoryService(testDb, { limit: 2, offset: 0 });

	expect(page.items.map((item) => item.timestamp)).toEqual([
		timestamps[2],
		timestamps[1],
	]);
	expect(page.items.map((item) => item.state)).toEqual([0, 1]);
	expect(page.hasMore).toBe(true);
});

it("supports offset pagination without over-reporting hasMore", async () => {
	const timestamps = await seed(3);

	const lastPage = await getHistoryService(testDb, { limit: 2, offset: 2 });

	expect(lastPage.items).toHaveLength(1);
	expect(lastPage.items[0]?.timestamp).toBe(timestamps[0]);
	expect(lastPage.hasMore).toBe(false);
});

it("reports hasMore false when the page exactly consumes the history", async () => {
	await seed(2);

	const page = await getHistoryService(testDb, { limit: 2, offset: 0 });

	expect(page.items).toHaveLength(2);
	expect(page.hasMore).toBe(false);
});
