import { expect, it } from "vitest";

import { healthRoutes } from "../health";

it("responds to the health check with an ok status", async () => {
	const response = await healthRoutes.request("/health");

	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toContain("application/json");
	expect(await response.json()).toEqual({ status: "ok" });
});
