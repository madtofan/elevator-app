import type { Database } from "@elevator-app/db";
import { gpioHistory } from "@elevator-app/db/schema/history";

import { type GpioChangeEvent, gpioBus } from "./bus";

/**
 * Persists a GPIO edge and then notifies the bus. Persisting first keeps the
 * SSE stream consistent with the history table.
 */
export function recordGpioChange(db: Database, event: GpioChangeEvent): void {
	db.insert(gpioHistory).values(event).run();
	gpioBus.emit("gpio-change", event);
}
