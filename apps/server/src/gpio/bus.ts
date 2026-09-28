import { EventEmitter } from "node:events";
import type { GpioChangeEvent } from "@elevator-app/api/gpio";

export {
	GPIO_INPUT_PIN,
	GPIO_OUTPUT_PIN,
	type GpioChangeEvent,
	type GpioState,
} from "@elevator-app/api/gpio";

type GpioBusEvents = {
	"gpio-change": [event: GpioChangeEvent];
};

export const gpioBus = new EventEmitter<GpioBusEvents>();

// Every connected SSE client registers one listener; the default limit of 10
// would warn once a handful of clients stream at the same time.
gpioBus.setMaxListeners(0);
