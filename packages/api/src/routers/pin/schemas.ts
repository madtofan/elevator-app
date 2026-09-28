import { z } from "zod";

export const pinStateSchema = z.object({
	pin: z.number().int(),
	state: z.union([z.literal(0), z.literal(1)]),
	timestamp: z.string().nullable(),
});

export type PinState = z.infer<typeof pinStateSchema>;
