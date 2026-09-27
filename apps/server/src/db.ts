import type { Database } from "@elevator-app/db";
import { createDb, migrationsFolder } from "@elevator-app/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { resolveDatabasePath } from "./database-path";
import { ENV } from "./env.server";

function resolveDatabasePathOrExit(): string {
	try {
		return resolveDatabasePath(ENV);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

export const db: Database = createDb({
	DATABASE_PATH: resolveDatabasePathOrExit(),
});

export function runMigrations(database: Database = db): void {
	try {
		migrate(database, { migrationsFolder });
	} catch (error) {
		console.error("[db] Failed to run migrations:", error);
		process.exit(1);
	}
}
