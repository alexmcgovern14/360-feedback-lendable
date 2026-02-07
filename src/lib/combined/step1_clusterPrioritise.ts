import { CollaborationFrequency, RelationshipType } from "@prisma/client";
import { generateJson } from "@/lib/llm/client";
import { buildClusterPrompt } from "@/lib/llm/prompts";
import { Step1Schema, type Step1Result } from "@/lib/schemas/combined";
import type { ReviewStructured } from "@/lib/schemas/reviewStructured";
import { computeWeight } from "./weights";

type SectionKey = "start_doing" | "stop_doing" | "continue_doing";

type SourceInsight = {
  reviewer: string;
  relationship_type: string;
  collaboration_frequency: string;
  confidence_rating: number;
  insight: string;
  description: string;
  evidence: string;
  weight: number;
};

const sectionKeys: SectionKey[] = ["start_doing", "stop_doing", "continue_doing"];

const toRelationship = (value: string) =>
  (value.toUpperCase() as RelationshipType) ?? RelationshipType.PEER;
const toFrequency = (value: string) =>
  (value.toUpperCase() as CollaborationFrequency) ?? CollaborationFrequency.MONTHLY;

export async function step1ClusterPrioritise(
  reviews: ReviewStructured[],
): Promise<Step1Result> {
  const allInsights: Record<SectionKey, SourceInsight[]> = {
    start_doing: [],
    stop_doing: [],
    continue_doing: [],
  };

  for (const review of reviews) {
    for (const section of sectionKeys) {
      for (const item of review[section]) {
        const relationshipType = toRelationship(review.metadata.relationship_type);
        const collaborationFrequency = toFrequency(
          review.metadata.collaboration_frequency,
        );

        const weight = computeWeight({
          relationshipType,
          collaborationFrequency,
          confidenceRating: item.confidence_rating,
        });

        allInsights[section].push({
          reviewer: review.metadata.reviewer,
          relationship_type: review.metadata.relationship_type,
          collaboration_frequency: review.metadata.collaboration_frequency,
          confidence_rating: item.confidence_rating,
          insight: item.insight,
          description: item.description,
          evidence: item.evidence,
          weight,
        });
      }
    }
  }

  const fallback: Step1Result = {
    primary: {
      start_doing: [],
      stop_doing: [],
      continue_doing: [],
    },
    omitted: {
      start_doing: [],
      stop_doing: [],
      continue_doing: [],
    },
  };

  for (const section of sectionKeys) {
    const sorted = [...allInsights[section]].sort(
      (a, b) => b.weight - a.weight,
    );
    const selected = sorted.slice(0, 3);
    const omitted = sorted.slice(3);

    fallback.primary[section] = selected.map((item) => ({
      title: item.insight,
      why_prioritized: `Weighted by ${item.relationship_type} and ${item.collaboration_frequency}; confidence ${item.confidence_rating}.`,
      sources: [item],
    }));
    fallback.omitted[section] = omitted;
  }

  return generateJson({
    messages: [
      {
        role: "user",
        content: buildClusterPrompt({ insights: allInsights }),
      },
    ],
    schema: Step1Schema,
    fallback,
  });
}
