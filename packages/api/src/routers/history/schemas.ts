import { z } from "zod";

export const getHistorySchema = z.object({
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().min(0).default(0),
});

export type GetHistoryInput = z.infer<typeof getHistorySchema>;

export const historyItemSchema = z.object({
	id: z.number().int(),
	pin: z.number().int(),
	state: z.union([z.literal(0), z.literal(1)]),
	timestamp: z.string(),
});

export const historyPageSchema = z.object({
	items: z.array(historyItemSchema),
	hasMore: z.boolean(),
});

export type HistoryPage = z.infer<typeof historyPageSchema>;
