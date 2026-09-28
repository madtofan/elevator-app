import { afterEach, expect, it, vi } from "vitest";

import { createApiHandler } from "../api-handlers";
import { createTestDb } from "../test/db";

afterEach(() => {
	vi.restoreAllMocks();
});

it("coerces query strings for OpenAPI GET endpoints", async () => {
	const handler = createApiHandler();
	const result = await handler.handle(
		new Request("http://localhost/getHistory?limit=5&offset=0"),
		{
			context: { db: createTestDb(), session: null },
		},
	);

	expect(result.matched).toBe(true);
	expect(result.response?.status).toBe(200);
	expect(await result.response?.json()).toEqual({ items: [], hasMore: false });
});

it("rejects out-of-range query values after coercion", async () => {
	vi.spyOn(console, "error").mockImplementation(() => undefined);

	const handler = createApiHandler();
	const result = await handler.handle(
		new Request("http://localhost/getHistory?limit=0&offset=-1"),
		{
			context: { db: createTestDb(), session: null },
		},
	);

	expect(result.matched).toBe(true);
	expect(result.response?.status).toBe(400);
});
