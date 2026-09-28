import { call } from "@orpc/server";
import { afterEach, expect, it } from "vitest";
import type { Context } from "../../context";

import { GPIO_OUTPUT_PIN } from "../../gpio";
import { resetTestData, testDb } from "../../test/db";
import { appRouter } from "../index";

afterEach(() => {
	resetTestData();
});

function createContext(): Context {
	return { db: testDb, session: null };
}

it("getPinState is public and defaults to off without history", async () => {
	const result = await call(appRouter.getPinState, undefined, {
		context: createContext(),
	});

	expect(result).toEqual({
		pin: GPIO_OUTPUT_PIN,
		state: 0,
		timestamp: null,
	});
});

it("togglePin is public and flips the state", async () => {
	const result = await call(appRouter.togglePin, undefined, {
		context: createContext(),
	});

	expect(result.pin).toBe(GPIO_OUTPUT_PIN);
	expect(result.state).toBe(1);
});

it("getHistory is public and returns recorded toggles", async () => {
	const context = createContext();

	await call(appRouter.togglePin, undefined, { context });
	const page = await call(
		appRouter.getHistory,
		{ limit: 20, offset: 0 },
		{ context },
	);

	expect(page.items).toHaveLength(1);
	expect(page.items[0]?.pin).toBe(GPIO_OUTPUT_PIN);
	expect(page.hasMore).toBe(false);
});
