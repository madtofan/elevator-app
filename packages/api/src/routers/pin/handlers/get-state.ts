import type { Database } from "@elevator-app/db";

import type { PinOutput } from "../../../context";
import { GPIO_OUTPUT_PIN, toGpioState } from "../../../gpio";
import { publicProcedure } from "../../../index";
import { type PinState, pinStateSchema } from "../schemas";
import { readLatestPinChange } from "../state";

/**
 * Live hardware state wins when the output pin is available; otherwise the
 * latest recorded transition is the source of truth, defaulting to off.
 *
 * The recorded timestamp only describes `state` while the live reading agrees
 * with it. After a boot reset (the pin is forced LOW without being recorded)
 * the previous transition no longer applies, so the timestamp is unknown.
 */
export function getPinStateService(
	db: Database,
	pinOutput?: PinOutput,
): PinState {
	const latest = readLatestPinChange(db, GPIO_OUTPUT_PIN);
	const liveState = pinOutput?.read() ?? null;
	const recordedState = latest ? toGpioState(latest.state) : null;
	const state = liveState ?? recordedState ?? 0;
	const timestamp =
		liveState === null || liveState === recordedState
			? (latest?.timestamp ?? null)
			: null;

	return {
		pin: GPIO_OUTPUT_PIN,
		state,
		timestamp,
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
