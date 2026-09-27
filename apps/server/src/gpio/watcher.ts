import type { Database } from "@elevator-app/db";

import { GPIO_PIN, type GpioState } from "./bus";
import { recordGpioChange } from "./recorder";

const DEBOUNCE_TIMEOUT_MS = 10;

export type GpioWatchCallback = (
	error: Error | null | undefined,
	value: GpioState,
) => void;

export type GpioInput = {
	watch: (callback: GpioWatchCallback) => void;
	unwatchAll: () => void;
	unexport: () => void;
};

export type GpioConstructor = {
	readonly accessible: boolean;
	new (
		pin: number,
		direction: "in",
		edge: "both",
		options: { debounceTimeout: number },
	): GpioInput;
};

export type GpioWatcherHandle = {
	close: () => void;
};

export type InitGpioWatcherOptions = {
	db: Database;
	pin?: number;
	loadGpio?: () => Promise<GpioConstructor>;
};

async function loadOnoffGpio(): Promise<GpioConstructor> {
	const { Gpio } = await import("onoff");
	return Gpio;
}

/**
 * Watches the configured pin for both edge transitions. Resolves to `null`
 * (instead of throwing) when `onoff` or the GPIO hardware is unavailable so
 * the server can keep booting on development machines.
 */
export async function initGpioWatcher({
	db,
	pin = GPIO_PIN,
	loadGpio = loadOnoffGpio,
}: InitGpioWatcherOptions): Promise<GpioWatcherHandle | null> {
	let Gpio: GpioConstructor;

	try {
		Gpio = await loadGpio();
	} catch (error) {
		console.warn("[gpio] onoff is unavailable, GPIO watcher disabled:", error);
		return null;
	}

	if (!Gpio.accessible) {
		console.warn(
			"[gpio] GPIO is not accessible on this platform, watcher disabled",
		);
		return null;
	}

	const input = new Gpio(pin, "in", "both", {
		debounceTimeout: DEBOUNCE_TIMEOUT_MS,
	});

	input.watch((error, value) => {
		if (error) {
			console.error("[gpio] pin watch failed:", error);
			return;
		}

		try {
			recordGpioChange(db, {
				pin,
				state: value,
				timestamp: new Date().toISOString(),
			});
		} catch (recordError) {
			console.error("[gpio] failed to record pin change:", recordError);
		}
	});

	return {
		close: () => {
			input.unwatchAll();
			input.unexport();
		},
	};
}
