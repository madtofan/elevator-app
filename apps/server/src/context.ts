import type {
	Context as ApiContext,
	PinOutput,
	PublishPinChange,
} from "@elevator-app/api/context";
import type { Context as HonoContext } from "hono";

import { auth, db } from "./services";

export type CreateContextOptions = {
	context: HonoContext;
};

export type ContextPorts = {
	pinOutput?: PinOutput;
	publishPinChange?: PublishPinChange;
};

/**
 * Builds the per-request oRPC context. Hardware and broadcast ports are
 * injected once at boot so handlers in `@elevator-app/api` never import the
 * server's GPIO modules directly.
 */
export function createContextFactory({
	pinOutput,
	publishPinChange,
}: ContextPorts = {}) {
	return async ({ context }: CreateContextOptions): Promise<ApiContext> => {
		const session = await auth.api.getSession({
			headers: context.req.raw.headers,
		});

		return {
			db,
			session,
			pinOutput,
			publishPinChange,
		};
	};
}
