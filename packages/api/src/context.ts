import type { Session } from "@elevator-app/auth";
import type { Database } from "@elevator-app/db";

import type { GpioChangeEvent, GpioState } from "./gpio";

/**
 * Hardware port for the output pin. Resolves to `null` when no GPIO hardware is
 * available, so the API can fall back to a logical, history-backed state.
 */
export type PinOutput = {
	read: () => GpioState | null;
	write: (state: GpioState) => boolean;
};

/** Fans a pin change out to real-time consumers (the SSE bus in the server). */
export type PublishPinChange = (event: GpioChangeEvent) => void;

export type Context = {
	session: Session | null;
	db: Database;
	pinOutput?: PinOutput;
	publishPinChange?: PublishPinChange;
};
