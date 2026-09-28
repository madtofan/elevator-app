import type { Database } from "@elevator-app/db";
import { gpioHistory } from "@elevator-app/db/schema/history";
import { desc, eq } from "drizzle-orm";

/**
 * Latest recorded transition for a pin, or `undefined` when the pin has no
 * history yet. Ordered by id (not timestamp) so equal timestamps stay stable.
 * Synchronous (better-sqlite3 is) so callers can compose atomic
 * read-modify-write sequences that never yield to another request.
 */
export function readLatestPinChange(db: Database, pin: number) {
	return db
		.select()
		.from(gpioHistory)
		.where(eq(gpioHistory.pin, pin))
		.orderBy(desc(gpioHistory.id))
		.limit(1)
		.get();
}
