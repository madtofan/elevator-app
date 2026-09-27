import { fileURLToPath } from "node:url";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export const migrationsFolder = fileURLToPath(
	new URL("./migrations", import.meta.url),
);

export function createDb(env: DatabaseConfig) {
	const client = new Sqlite(env.DATABASE_PATH);

	return drizzle({ client, relations });
}

export type Database = ReturnType<typeof createDb>;
