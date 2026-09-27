CREATE TABLE `gpio_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pin` integer NOT NULL,
	`state` integer NOT NULL,
	`timestamp` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gpio_history_timestamp_idx` ON `gpio_history` (`timestamp`);