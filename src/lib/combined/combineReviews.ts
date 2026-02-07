import { NominationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ReviewStructuredSchema } from "@/lib/schemas/reviewStructured";
import { step1ClusterPrioritise } from "./step1_clusterPrioritise";
import { step2WriteSyntheses } from "./step2_writeSyntheses";
import { step3ExecutiveSummary } from "./step3_execSummary";

export async function combineReviews(cycleId: string) {
  const structuredReviews = await prisma.reviewStructured.findMany({
    where: {
      nomination: {
        cycleId,
        status: NominationStatus.SUBMITTED,
      },
    },
    include: {
      nomination: true,
    },
  });

  if (structuredReviews.length < 2) {
    return null;
  }

  const parsed = structuredReviews
    .map((review) => ReviewStructuredSchema.safeParse(review.json))
    .filter((result) => result.success)
    .map((result) => result.data);

  if (parsed.length < 2) return null;

  const step1 = await step1ClusterPrioritise(parsed);
  const step2 = await step2WriteSyntheses(step1.primary);
  const step3 = await step3ExecutiveSummary(step2);

  return prisma.combinedReview.upsert({
    where: { cycleId },
    update: {
      step1PrimaryJson: step1.primary,
      step1OmittedJson: step1.omitted,
      step2Json: step2,
      step3Json: step3,
    },
    create: {
      cycleId,
      step1PrimaryJson: step1.primary,
      step1OmittedJson: step1.omitted,
      step2Json: step2,
      step3Json: step3,
    },
  });
}
