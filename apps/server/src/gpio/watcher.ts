import type { Database } from "@elevator-app/db";

import { GPIO_INPUT_PIN, type GpioState } from "./bus";
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
	loadGpio?: () => Promise<GpioConstructor>;
};

async function loadOnoffGpio(): Promise<GpioConstructor> {
	const { Gpio } = await import("onoff");
	return Gpio;
}

/**
 * Watches GPIO_INPUT_PIN for both edge transitions. Resolves to `null` (instead of
 * throwing) when `onoff` is unavailable, the hardware is inaccessible, or the
 * pin cannot be exported or watched, so the server keeps booting: this runs
 * behind a top-level `await` in `index.ts`, where a rejection would kill the
 * process. Only migrations may fail fast.
 */
export async function initGpioWatcher({
	db,
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

	const onPinChange: GpioWatchCallback = (error, value) => {
		if (error) {
			console.error("[gpio] pin watch failed:", error);
			return;
		}

		try {
			recordGpioChange(db, {
				pin: GPIO_INPUT_PIN,
				state: value,
				timestamp: new Date().toISOString(),
			});
		} catch (recordError) {
			console.error("[gpio] failed to record pin change:", recordError);
		}
	};

	let input: GpioInput;

	try {
		input = new Gpio(GPIO_INPUT_PIN, "in", "both", {
			debounceTimeout: DEBOUNCE_TIMEOUT_MS,
		});
		input.watch(onPinChange);
	} catch (error) {
		console.warn(
			"[gpio] failed to initialize the pin watcher, disabled:",
			error,
		);
		return null;
	}

	return {
		close: () => {
			input.unwatchAll();
			input.unexport();
		},
	};
}
