import { user } from "@elevator-app/db/schema/auth";
import { describe, expect, it } from "vitest";

import { resetTestData, testDb } from "../db";

describe("testDb", () => {
	it("applies migrations and resets seeded rows", async () => {
		await testDb.insert(user).values({
			id: "user-1",
			name: "Test User",
			email: "test@example.com",
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const rows = await testDb.select().from(user);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.email).toBe("test@example.com");

		resetTestData();

		const remaining = await testDb.select().from(user);
		expect(remaining).toHaveLength(0);
	});
});
