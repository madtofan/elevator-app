import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { getHistory } from "./history/handlers/list";
import { getPinState } from "./pin/handlers/get-state";
import { togglePin } from "./pin/handlers/toggle";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	getPinState,
	togglePin,
	getHistory,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
