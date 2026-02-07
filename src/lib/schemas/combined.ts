import { z } from "zod";

export const SourceInsightSchema = z.object({
  reviewer: z.string(),
  relationship_type: z.string(),
  collaboration_frequency: z.string(),
  confidence_rating: z.number().min(0).max(5),
  insight: z.string(),
  description: z.string(),
  evidence: z.string(),
  weight: z.number().optional(),
});

export const ClusterSchema = z.object({
  title: z.string(),
  why_prioritized: z.string(),
  sources: z.array(SourceInsightSchema),
});

export const Step1Schema = z.object({
  primary: z.object({
    start_doing: z.array(ClusterSchema),
    stop_doing: z.array(ClusterSchema),
    continue_doing: z.array(ClusterSchema),
  }),
  omitted: z.object({
    start_doing: z.array(SourceInsightSchema),
    stop_doing: z.array(SourceInsightSchema),
    continue_doing: z.array(SourceInsightSchema),
  }),
});

export const SynthInsightSchema = z.object({
  title: z.string(),
  synthesis: z.string(),
  why_prioritized: z.string(),
  evidence_quotes: z.array(z.string()),
});

export const Step2Schema = z.object({
  start_doing: z.array(SynthInsightSchema),
  stop_doing: z.array(SynthInsightSchema),
  continue_doing: z.array(SynthInsightSchema),
});

export const Step3Schema = Step2Schema.extend({
  executive_summary: z.string(),
});

export type Step1Result = z.infer<typeof Step1Schema>;
export type Step2Result = z.infer<typeof Step2Schema>;
export type Step3Result = z.infer<typeof Step3Schema>;
