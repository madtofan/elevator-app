import { GPIO_OUTPUT_PIN, type GpioState } from "@elevator-app/api/gpio";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
	createPinOutputPort,
	type GpioOutputPin,
	initGpioOutput,
} from "../output";

class FakeGpio implements GpioOutputPin {
	static accessible = true;
	static instances: FakeGpio[] = [];

	readonly pin: number;
	readonly direction: "out";
	readonly unexport = vi.fn();
	readonly writeSync = vi.fn<(value: number) => void>();
	private readSyncValue: GpioState = 0;

	constructor(pin: number, direction: "out") {
		this.pin = pin;
		this.direction = direction;
		FakeGpio.instances.push(this);
	}

	readSync(): GpioState {
		return this.readSyncValue;
	}

	setReadSyncValue(value: GpioState): void {
		this.readSyncValue = value;
	}
}

class ThrowingConstructorGpio extends FakeGpio {
	constructor(pin: number, direction: "out") {
		super(pin, direction);
		throw new Error("EPERM: cannot export pin");
	}
}

const loadFakeGpio = () => Promise.resolve(FakeGpio);

beforeEach(() => {
	FakeGpio.instances = [];
});

afterEach(() => {
	vi.restoreAllMocks();
});

it("initializes pin 27 as an output and starts LOW", async () => {
	const handle = await initGpioOutput({ loadGpio: loadFakeGpio });

	expect(handle).not.toBeNull();

	const [gpio] = FakeGpio.instances;

	expect(gpio?.pin).toBe(GPIO_OUTPUT_PIN);
	expect(gpio?.direction).toBe("out");
	expect(gpio?.writeSync).toHaveBeenCalledWith(0);
});

it("reads and writes through the handle", async () => {
	const handle = await initGpioOutput({ loadGpio: loadFakeGpio });
	const [gpio] = FakeGpio.instances;

	gpio?.setReadSyncValue(1);

	expect(handle?.read()).toBe(1);

	handle?.write(0);

	expect(gpio?.writeSync).toHaveBeenLastCalledWith(0);
});

it("unexports the pin on close", async () => {
	const handle = await initGpioOutput({ loadGpio: loadFakeGpio });
	const [gpio] = FakeGpio.instances;

	handle?.close();

	expect(gpio?.unexport).toHaveBeenCalledTimes(1);
});

it("returns null when onoff cannot be loaded", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);

	const handle = await initGpioOutput({
		loadGpio: () => Promise.reject(new Error("no native binding")),
	});

	expect(handle).toBeNull();
	expect(consoleWarn).toHaveBeenCalledTimes(1);
	expect(FakeGpio.instances).toHaveLength(0);
});

it("returns null when GPIO is not accessible", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);

	class InaccessibleGpio extends FakeGpio {
		static accessible = false;
	}

	const handle = await initGpioOutput({
		loadGpio: () => Promise.resolve(InaccessibleGpio),
	});

	expect(handle).toBeNull();
	expect(consoleWarn).toHaveBeenCalledTimes(1);
});

it("returns null when the pin cannot be exported", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);

	const handle = await initGpioOutput({
		loadGpio: () => Promise.resolve(ThrowingConstructorGpio),
	});

	expect(handle).toBeNull();
	expect(consoleWarn).toHaveBeenCalledTimes(1);
});

it("returns undefined without a hardware handle", () => {
	expect(createPinOutputPort(null)).toBeUndefined();
});

it("passes successful reads and writes through the port", () => {
	const port = createPinOutputPort({
		read: () => 1,
		write: vi.fn<(state: GpioState) => void>(),
		close: vi.fn(),
	});

	expect(port?.read()).toBe(1);
	expect(port?.write(0)).toBe(true);
});

it("downgrades read and write failures to warnings", () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);
	const port = createPinOutputPort({
		read: () => {
			throw new Error("EPERM: cannot read");
		},
		write: () => {
			throw new Error("EPERM: cannot write");
		},
		close: vi.fn(),
	});

	expect(port?.read()).toBeNull();
	expect(port?.write(1)).toBe(false);
	expect(consoleWarn).toHaveBeenCalledTimes(2);
});
