import { z } from "zod";

export const FollowUpSchema = z.object({
  action: z.enum(["ask", "enough"]),
  question: z.string().nullable(),
  reason: z.string(),
});

export type FollowUpResult = z.infer<typeof FollowUpSchema>;
