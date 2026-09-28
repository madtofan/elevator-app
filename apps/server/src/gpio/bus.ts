import { EventEmitter } from "node:events";

export const GPIO_PIN = 17;

export type GpioState = 0 | 1;

export type GpioChangeEvent = {
	pin: number;
	state: GpioState;
	timestamp: string;
};

type GpioBusEvents = {
	"gpio-change": [event: GpioChangeEvent];
};

export const gpioBus = new EventEmitter<GpioBusEvents>();

// Every connected SSE client registers one listener; the default limit of 10
// would warn once a handful of clients stream at the same time.
gpioBus.setMaxListeners(0);
