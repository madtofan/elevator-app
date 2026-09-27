import { call } from "@orpc/server";
import { afterEach, describe, expect, it } from "vitest";
import { resetTestData, testDb } from "../../test/db";
import { appRouter } from "../index";

afterEach(() => {
	resetTestData();
});

describe("healthCheck", () => {
	it("returns OK", async () => {
		const result = await call(appRouter.healthCheck, undefined, {
			context: { db: testDb, session: null },
		});

		expect(result).toBe("OK");
	});
});
