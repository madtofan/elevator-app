import type { Database } from "@elevator-app/db";
import { createDb, migrationsFolder } from "@elevator-app/db";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { ENV } from "./env.server";

export const PRODUCTION_DATABASE_PATH = "/home/pi/gpio-app/gpio_data.db";

function resolveDatabasePath(): string {
	if (
		ENV.NODE_ENV === "production" &&
		ENV.DATABASE_PATH !== PRODUCTION_DATABASE_PATH
	) {
		console.error(
			`[db] DATABASE_PATH must be ${PRODUCTION_DATABASE_PATH} in production (received: ${ENV.DATABASE_PATH})`,
		);
		process.exit(1);
	}

	return ENV.DATABASE_PATH;
}

export const db: Database = createDb({ DATABASE_PATH: resolveDatabasePath() });

export function runMigrations(database: Database = db): void {
	try {
		migrate(database, { migrationsFolder });
	} catch (error) {
		console.error("[db] Failed to run migrations:", error);
		process.exit(1);
	}
}
