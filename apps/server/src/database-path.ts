export const PRODUCTION_DATABASE_PATH = "/home/pi/gpio-app/gpio_data.db";

export type DatabasePathConfig = {
	NODE_ENV: string;
	DATABASE_PATH: string;
};

/**
 * Resolves the SQLite path for the current environment. Production must point at
 * the persistent absolute path so OTA symlink rotations cannot orphan the database.
 */
export function resolveDatabasePath({
	NODE_ENV,
	DATABASE_PATH,
}: DatabasePathConfig): string {
	if (NODE_ENV === "production" && DATABASE_PATH !== PRODUCTION_DATABASE_PATH) {
		throw new Error(
			`DATABASE_PATH must be ${PRODUCTION_DATABASE_PATH} in production (received: ${DATABASE_PATH})`,
		);
	}

	return DATABASE_PATH;
}
