import type { Database } from "@elevator-app/db";
import { createDb, migrationsFolder } from "@elevator-app/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

/** Fresh in-memory database with every migration applied. */
export function createTestDb(): Database {
	const database = createDb({ DATABASE_PATH: ":memory:" });
	const migrationFailure = migrate(database, { migrationsFolder });

	if (migrationFailure) {
		throw new Error(
			`Failed to initialize the test database: ${migrationFailure.exitCode}`,
		);
	}

	return database;
}
