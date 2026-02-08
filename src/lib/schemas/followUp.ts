import { z } from "zod";

export const FollowUpSchema = z.object({
  question: z.string().min(1),
  reason: z.string(),
});

export type FollowUpResult = z.infer<typeof FollowUpSchema>;
