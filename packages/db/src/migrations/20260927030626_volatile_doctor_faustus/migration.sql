PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_gpio_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pin` integer NOT NULL,
	`state` integer NOT NULL,
	`timestamp` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "gpio_history_state_check" CHECK("state" in (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_gpio_history`(`id`, `pin`, `state`, `timestamp`) SELECT `id`, `pin`, `state`, `timestamp` FROM `gpio_history`;--> statement-breakpoint
DROP TABLE `gpio_history`;--> statement-breakpoint
ALTER TABLE `__new_gpio_history` RENAME TO `gpio_history`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `gpio_history_timestamp_idx` ON `gpio_history` (`timestamp`);