import type { Database } from "@elevator-app/db";

import type { PinOutput } from "../../../context";
import { GPIO_OUTPUT_PIN, toGpioState } from "../../../gpio";
import { publicProcedure } from "../../../index";
import { type PinState, pinStateSchema } from "../schemas";
import { readLatestPinChange } from "../state";

/**
 * Live hardware state wins when the output pin is available; otherwise the
 * latest recorded transition is the source of truth, defaulting to off.
 */
export async function getPinStateService(
	db: Database,
	pinOutput?: PinOutput,
): Promise<PinState> {
	const latest = await readLatestPinChange(db, GPIO_OUTPUT_PIN);
	const liveState = pinOutput?.read() ?? null;
	const recordedState = latest ? toGpioState(latest.state) : null;

	return {
		pin: GPIO_OUTPUT_PIN,
		state: liveState ?? recordedState ?? 0,
		timestamp: latest?.timestamp ?? null,
	};
}

export const getPinState = publicProcedure
	.route({
		method: "GET",
		path: "/getPinState",
		summary: "Get the current pin state",
		description:
			"Returns the live state of the output pin when GPIO hardware is available, otherwise the latest recorded state.",
		tags: ["GPIO"],
		successStatus: 200,
		successDescription: "The current pin state.",
	})
	.output(pinStateSchema)
	.handler(({ context }) => getPinStateService(context.db, context.pinOutput));
