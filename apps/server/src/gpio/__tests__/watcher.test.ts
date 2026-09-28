import { gpioHistory } from "@elevator-app/db/schema/history";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { createTestDb } from "../../test/db";
import {
	GPIO_INPUT_PIN,
	type GpioChangeEvent,
	type GpioState,
	gpioBus,
} from "../bus";
import { type GpioWatchCallback, initGpioWatcher } from "../watcher";

class FakeGpio {
	static accessible = true;
	static instances: FakeGpio[] = [];

	readonly pin: number;
	readonly direction: "in";
	readonly edge: "both";
	readonly options: { debounceTimeout: number };
	readonly unwatchAll = vi.fn();
	readonly unexport = vi.fn();
	private watchCallback: GpioWatchCallback | null = null;

	constructor(
		pin: number,
		direction: "in",
		edge: "both",
		options: { debounceTimeout: number },
	) {
		this.pin = pin;
		this.direction = direction;
		this.edge = edge;
		this.options = options;
		FakeGpio.instances.push(this);
	}

	watch(callback: GpioWatchCallback): void {
		this.watchCallback = callback;
	}

	emitState(value: GpioState): void {
		this.watchCallback?.(null, value);
	}

	emitError(error: Error): void {
		this.watchCallback?.(error, 0);
	}
}

class ThrowingConstructorGpio extends FakeGpio {
	constructor() {
		super(GPIO_INPUT_PIN, "in", "both", { debounceTimeout: 10 });
		throw new Error("EPERM: cannot export pin");
	}
}

class ThrowingWatchGpio extends FakeGpio {
	override watch(): void {
		throw new Error("EPERM: cannot watch pin");
	}
}

const loadFakeGpio = () => Promise.resolve(FakeGpio);

beforeEach(() => {
	FakeGpio.instances = [];
});

afterEach(() => {
	gpioBus.removeAllListeners("gpio-change");
	vi.restoreAllMocks();
});

it("initializes pin 17 as an input on both edges with a 10ms debounce", async () => {
	const handle = await initGpioWatcher({
		db: createTestDb(),
		loadGpio: loadFakeGpio,
	});

	expect(handle).not.toBeNull();
	const [gpio] = FakeGpio.instances;
	expect(gpio?.pin).toBe(GPIO_INPUT_PIN);
	expect(gpio?.direction).toBe("in");
	expect(gpio?.edge).toBe("both");
	expect(gpio?.options).toEqual({ debounceTimeout: 10 });
});

it("records the edge in SQLite and emits it on the bus", async () => {
	const db = createTestDb();
	const listener = vi.fn<(event: GpioChangeEvent) => void>();
	gpioBus.on("gpio-change", listener);

	await initGpioWatcher({ db, loadGpio: loadFakeGpio });
	FakeGpio.instances[0]?.emitState(1);

	const rows = await db.select().from(gpioHistory);

	expect(rows).toHaveLength(1);
	expect(rows[0]?.pin).toBe(GPIO_INPUT_PIN);
	expect(rows[0]?.state).toBe(1);
	expect(listener).toHaveBeenCalledTimes(1);
	const [payload] = listener.mock.calls[0] ?? [];
	expect(payload?.state).toBe(1);
	expect(payload?.timestamp).toBe(rows[0]?.timestamp);
	expect(payload?.timestamp).toMatch(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
	);
});

it("logs watch errors without recording or emitting", async () => {
	const consoleError = vi
		.spyOn(console, "error")
		.mockImplementation(() => undefined);
	const db = createTestDb();
	const listener = vi.fn();
	gpioBus.on("gpio-change", listener);

	await initGpioWatcher({ db, loadGpio: loadFakeGpio });
	FakeGpio.instances[0]?.emitError(new Error("watch failed"));

	expect(consoleError).toHaveBeenCalledTimes(1);
	const rows = await db.select().from(gpioHistory);
	expect(rows).toHaveLength(0);
	expect(listener).not.toHaveBeenCalled();
});

it("returns null when onoff cannot be loaded", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);

	const handle = await initGpioWatcher({
		db: createTestDb(),
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

	const handle = await initGpioWatcher({
		db: createTestDb(),
		loadGpio: () => Promise.resolve(InaccessibleGpio),
	});

	expect(handle).toBeNull();
	expect(consoleWarn).toHaveBeenCalledTimes(1);
});

it("unwatches and unexports the pin on close", async () => {
	const handle = await initGpioWatcher({
		db: createTestDb(),
		loadGpio: loadFakeGpio,
	});
	const [gpio] = FakeGpio.instances;

	handle?.close();

	expect(gpio?.unwatchAll).toHaveBeenCalledTimes(1);
	expect(gpio?.unexport).toHaveBeenCalledTimes(1);
});

it("returns null when the pin cannot be exported", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);

	const handle = await initGpioWatcher({
		db: createTestDb(),
		loadGpio: () => Promise.resolve(ThrowingConstructorGpio),
	});

	expect(handle).toBeNull();
	expect(consoleWarn).toHaveBeenCalledTimes(1);
});

it("returns null when watch registration fails", async () => {
	const consoleWarn = vi
		.spyOn(console, "warn")
		.mockImplementation(() => undefined);

	const handle = await initGpioWatcher({
		db: createTestDb(),
		loadGpio: () => Promise.resolve(ThrowingWatchGpio),
	});

	expect(handle).toBeNull();
	expect(consoleWarn).toHaveBeenCalledTimes(1);
});
