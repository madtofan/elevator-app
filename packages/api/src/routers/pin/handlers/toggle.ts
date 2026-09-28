import type { Database } from "@elevator-app/db";
import { gpioHistory } from "@elevator-app/db/schema/history";

import type { PinOutput, PublishPinChange } from "../../../context";
import { GPIO_OUTPUT_PIN, type GpioState } from "../../../gpio";
import { publicProcedure } from "../../../index";
import { type PinState, pinStateSchema } from "../schemas";
import { getPinStateService } from "./get-state";

export type TogglePinServiceOptions = {
	pinOutput?: PinOutput;
	publishPinChange?: PublishPinChange;
};

/**
 * Flips the output pin to the opposite state. Synchronous end to end (sync
 * read, sync insert) so concurrent toggles cannot interleave between the read
 * and the write and record the same transition twice. The hardware write is
 * best effort: failures are reported by the port (which logs them) and the
 * logical state is still recorded and published so the PWA keeps working
 * without GPIO.
 */
export function togglePinService(
	db: Database,
	{ pinOutput, publishPinChange }: TogglePinServiceOptions = {},
): PinState {
	const { state: currentState } = getPinStateService(db, pinOutput);
	const state: GpioState = currentState === 1 ? 0 : 1;
	const event = {
		pin: GPIO_OUTPUT_PIN,
		state,
		timestamp: new Date().toISOString(),
	};

	pinOutput?.write(state);
	db.insert(gpioHistory).values(event).run();
	publishPinChange?.(event);

	return event;
}

export const togglePin = publicProcedure
	.route({
		method: "POST",
		path: "/togglePin",
		summary: "Toggle the output pin",
		description:
			"Flips the output pin (GPIO 27), records the transition, and broadcasts it on the GPIO event stream. Falls back to a logical toggle when GPIO hardware is unavailable.",
		tags: ["GPIO"],
		successStatus: 200,
		successDescription: "The new pin state.",
	})
	.output(pinStateSchema)
	.handler(({ context }) =>
		togglePinService(context.db, {
			pinOutput: context.pinOutput,
			publishPinChange: context.publishPinChange,
		}),
	);
