import { z } from "zod";

export const swipeDirectionEnum = z.enum(["left", "right"]);

export const swipeSchema = z.strictObject({ direction: swipeDirectionEnum });
export type SwipeInput = z.infer<typeof swipeSchema>;
