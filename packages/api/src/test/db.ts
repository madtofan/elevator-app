import type { Database } from "@elevator-app/db";
import { createDb, migrationsFolder } from "@elevator-app/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export const testDb: Database = createDb({ DATABASE_PATH: ":memory:" });

const migrationFailure = migrate(testDb, { migrationsFolder });

if (migrationFailure) {
	throw new Error(
		`Failed to initialize the test database: ${migrationFailure.exitCode}`,
	);
}

export function resetTestData() {
	const tables = testDb.$client
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
		)
		.all() as { name: string }[];

	for (const { name } of tables) {
		testDb.$client.prepare(`DELETE FROM "${name}"`).run();
	}
}
