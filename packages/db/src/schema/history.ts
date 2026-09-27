import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gpioHistory = sqliteTable(
	"gpio_history",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		pin: integer("pin").notNull(),
		state: integer("state").notNull(),
		timestamp: text("timestamp")
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	},
	(table) => [index("gpio_history_timestamp_idx").on(table.timestamp)],
);
