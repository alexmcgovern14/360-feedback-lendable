import { ReviewStructuredSchema } from "@/lib/schemas/reviewStructured";
import type { ReviewStructured } from "@/lib/schemas/reviewStructured";
import { getStructuredReviewsForCycle } from "@/lib/json-data";
import { listAll, makeArtifactTimestamp, putJson, getJson } from "@/lib/blob-store";
import type { StructuredReviewArtifact } from "@/lib/runtime/structured-artifacts";
import { step1ClusterPrioritise } from "@/lib/combined/step1_clusterPrioritise";
import { step2WriteSyntheses } from "@/lib/combined/step2_writeSyntheses";
import { step3ExecutiveSummary } from "@/lib/combined/step3_execSummary";

export type CombinedArtifactsLatest = {
  version: 1;
  cycleId: string;
  createdAt: string;
  timestamp: string;
  step1PrimaryJson: unknown;
  step1OmittedJson: unknown;
  step2Json: unknown;
  step3Json: unknown;
};

function latestPath(cycleId: string) {
  return `artifacts/combined/${cycleId}/latest.json`;
}

function basePrefix(args: { cycleId: string; timestamp: string }) {
  return `artifacts/combined/${args.cycleId}/${args.timestamp}`;
}

function stepPaths(args: { cycleId: string; timestamp: string }) {
  const base = basePrefix(args);
  return {
    step1Primary: `${base}/step1_primary.json`,
    step1Omitted: `${base}/step1_omitted.json`,
    step2: `${base}/step2.json`,
    step3: `${base}/step3.json`,
  };
}

async function loadStructuredReviewsFromBlob(cycleId: string): Promise<ReviewStructured[]> {
  const blobs = await listAll(`artifacts/structured/${cycleId}/`, {
    required: true,
  });
  const latest = blobs.filter((b) => b.pathname.endsWith("/latest.json"));
  const results: ReviewStructured[] = [];
  for (const b of latest) {
    const artifact = await getJson<StructuredReviewArtifact>(b.pathname, {
      required: true,
    });
    if (!artifact) continue;
    const parsed = ReviewStructuredSchema.safeParse(artifact.json);
    if (parsed.success) results.push(parsed.data);
  }
  return results;
}

/** Seed structured reviews for this cycle (submitted nominations only). */
function loadStructuredReviewsFromSeed(cycleId: string): ReviewStructured[] {
  const records = getStructuredReviewsForCycle(cycleId);
  return records
    .map((r) => ReviewStructuredSchema.safeParse(r.json))
    .filter((result) => result.success)
    .map((result) => result.data as ReviewStructured);
}

/** All structured reviews for the cycle: seed (synthetic) + runtime (Blob). */
async function loadAllStructuredReviewsForCycle(cycleId: string): Promise<ReviewStructured[]> {
  const [fromSeed, fromBlob] = await Promise.all([
    Promise.resolve(loadStructuredReviewsFromSeed(cycleId)),
    loadStructuredReviewsFromBlob(cycleId),
  ]);
  return [...fromSeed, ...fromBlob];
}

export async function getLatestCombinedArtifacts(cycleId: string): Promise<CombinedArtifactsLatest | null> {
  return getJson<CombinedArtifactsLatest>(latestPath(cycleId), {
    required: true,
  });
}

/**
 * Check if combined review generation is needed or in progress.
 * Returns true if we have 2+ structured reviews but no combined review yet.
 */
export async function isCombinedReviewGenerationNeeded(
  cycleId: string,
): Promise<boolean> {
  const structured = await loadAllStructuredReviewsForCycle(cycleId);
  if (structured.length < 2) return false;
  const combined = await getLatestCombinedArtifacts(cycleId);
  return combined === null;
}

export async function generateAndSaveCombinedArtifacts(cycleId: string) {
  const structured = await loadAllStructuredReviewsForCycle(cycleId);
  if (structured.length < 2) return null;

  const step1 = await step1ClusterPrioritise(structured);
  const step2 = await step2WriteSyntheses(step1.primary);
  const step3 = await step3ExecutiveSummary(step2);

  const createdAt = new Date().toISOString();
  const timestamp = makeArtifactTimestamp(new Date(createdAt));
  const paths = stepPaths({ cycleId, timestamp });

  await putJson(paths.step1Primary, step1.primary, { required: true });
  await putJson(paths.step1Omitted, step1.omitted, { required: true });
  await putJson(paths.step2, step2, { required: true });
  await putJson(paths.step3, step3, { required: true });

  const latest: CombinedArtifactsLatest = {
    version: 1,
    cycleId,
    createdAt,
    timestamp,
    step1PrimaryJson: step1.primary,
    step1OmittedJson: step1.omitted,
    step2Json: step2,
    step3Json: step3,
  };

  await putJson(latestPath(cycleId), latest, {
    allowOverwrite: true,
    required: true,
  });

  return latest;
}

