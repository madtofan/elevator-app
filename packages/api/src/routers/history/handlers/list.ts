import type { Database } from "@elevator-app/db";
import { gpioHistory } from "@elevator-app/db/schema/history";
import { desc } from "drizzle-orm";

import { toGpioState } from "../../../gpio";
import { publicProcedure } from "../../../index";
import {
	type GetHistoryInput,
	getHistorySchema,
	type HistoryPage,
	historyPageSchema,
} from "../schemas";

/**
 * Newest-first page of recorded transitions. Fetches one row beyond the limit
 * to report `hasMore` without a second COUNT query.
 */
export async function getHistoryService(
	db: Database,
	input: GetHistoryInput,
): Promise<HistoryPage> {
	const rows = await db
		.select()
		.from(gpioHistory)
		.orderBy(desc(gpioHistory.id))
		.limit(input.limit + 1)
		.offset(input.offset);

	const hasMore = rows.length > input.limit;

	return {
		items: (hasMore ? rows.slice(0, input.limit) : rows).map((row) => ({
			...row,
			state: toGpioState(row.state),
		})),
		hasMore,
	};
}

export const getHistory = publicProcedure
	.route({
		method: "GET",
		path: "/getHistory",
		summary: "List pin state transitions",
		description:
			"Returns recorded pin state transitions (input and output), newest first, with offset pagination.",
		tags: ["History"],
		successStatus: 200,
		successDescription: "A page of pin state transitions.",
	})
	.input(getHistorySchema)
	.output(historyPageSchema)
	.handler(({ context, input }) => getHistoryService(context.db, input));
