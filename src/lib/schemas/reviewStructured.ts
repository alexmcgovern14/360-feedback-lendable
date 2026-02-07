import { z } from "zod";

const TranscriptMessageSchema = z.object({
  role: z.enum(["reviewer", "assistant", "system"]),
  content: z.string(),
});

const InsightSchema = z.object({
  insight: z.string(),
  description: z.string(),
  evidence: z.string(),
  confidence_rating: z.number().min(0).max(5),
});

export const ReviewStructuredSchema = z.object({
  metadata: z.object({
    employee: z.string(),
    reviewer: z.string(),
    relationship_type: z.string(),
    collaboration_frequency: z.string(),
  }),
  start_doing: z.array(InsightSchema),
  stop_doing: z.array(InsightSchema),
  continue_doing: z.array(InsightSchema),
  full_transcript: z.array(TranscriptMessageSchema),
});

export type ReviewStructured = z.infer<typeof ReviewStructuredSchema>;
