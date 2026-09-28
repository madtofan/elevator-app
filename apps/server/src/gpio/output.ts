import type { PinOutput } from "@elevator-app/api/context";
import {
	GPIO_OUTPUT_PIN,
	type GpioState,
	toGpioState,
} from "@elevator-app/api/gpio";

export type GpioOutputPin = {
	readSync: () => GpioState;
	writeSync: (value: GpioState) => void;
	unexport: () => void;
};

export type GpioOutputConstructor = {
	readonly accessible: boolean;
	new (pin: number, direction: "out"): GpioOutputPin;
};

export type GpioOutputHandle = {
	read: () => GpioState;
	write: (state: GpioState) => void;
	close: () => void;
};

export type InitGpioOutputOptions = {
	loadGpio?: () => Promise<GpioOutputConstructor>;
};

async function loadOnoffGpio(): Promise<GpioOutputConstructor> {
	const { Gpio } = await import("onoff");
	return Gpio;
}

/**
 * Opens GPIO 27 as an output and drives it LOW. Resolves to `null` (instead of
 * throwing) when `onoff` is unavailable, the hardware is inaccessible, or the
 * pin cannot be initialized, so the server keeps booting: this runs behind a
 * top-level `await` in `index.ts`, where a rejection would kill the process.
 * Only migrations may fail fast. Always starting LOW means a restart can never
 * re-energize a relay unexpectedly.
 */
export async function initGpioOutput({
	loadGpio = loadOnoffGpio,
}: InitGpioOutputOptions = {}): Promise<GpioOutputHandle | null> {
	let Gpio: GpioOutputConstructor;

	try {
		Gpio = await loadGpio();
	} catch (error) {
		console.warn("[gpio] onoff is unavailable, output pin disabled:", error);
		return null;
	}

	if (!Gpio.accessible) {
		console.warn(
			"[gpio] GPIO is not accessible on this platform, output pin disabled",
		);
		return null;
	}

	let pin: GpioOutputPin;

	try {
		pin = new Gpio(GPIO_OUTPUT_PIN, "out");
		pin.writeSync(0);
	} catch (error) {
		console.warn(
			"[gpio] failed to initialize the output pin, disabled:",
			error,
		);
		return null;
	}

	return {
		read: () => toGpioState(pin.readSync()),
		write: (state) => {
			pin.writeSync(state);
		},
		close: () => {
			pin.unexport();
		},
	};
}

/**
 * Wraps the hardware handle in the API port contract, downgrading read/write
 * failures to warnings so API calls keep working (and the logical state keeps
 * moving) when the pin misbehaves at runtime. Without a handle the port is
 * `undefined`, which the API treats as "no hardware, use the recorded state".
 */
export function createPinOutputPort(
	output: GpioOutputHandle | null,
): PinOutput | undefined {
	if (!output) {
		return undefined;
	}

	return {
		read: () => {
			try {
				return output.read();
			} catch (error) {
				console.warn("[gpio] failed to read the output pin:", error);
				return null;
			}
		},
		write: (state) => {
			try {
				output.write(state);
				return true;
			} catch (error) {
				console.warn("[gpio] failed to write the output pin:", error);
				return false;
			}
		},
	};
}
