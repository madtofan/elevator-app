import { expect, it } from "vitest";

import {
	PRODUCTION_DATABASE_PATH,
	resolveDatabasePath,
} from "../database-path";

it("returns DATABASE_PATH unchanged outside production", () => {
	expect(
		resolveDatabasePath({
			NODE_ENV: "development",
			DATABASE_PATH: "../../local.db",
		}),
	).toBe("../../local.db");
});

it("accepts the persistent absolute path in production", () => {
	expect(
		resolveDatabasePath({
			NODE_ENV: "production",
			DATABASE_PATH: PRODUCTION_DATABASE_PATH,
		}),
	).toBe(PRODUCTION_DATABASE_PATH);
});

it("throws in production when DATABASE_PATH is not the persistent path", () => {
	expect(() =>
		resolveDatabasePath({
			NODE_ENV: "production",
			DATABASE_PATH: "./gpio_data.db",
		}),
	).toThrow(PRODUCTION_DATABASE_PATH);
});
