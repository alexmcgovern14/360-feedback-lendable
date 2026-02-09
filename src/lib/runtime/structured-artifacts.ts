import type { ReviewStructured } from "@/lib/schemas/reviewStructured";
import { getJson, makeArtifactTimestamp, putJson } from "@/lib/blob-store";

export type StructuredReviewArtifact = {
  version: 1;
  cycleId: string;
  token: string;
  nominationId: string;
  model: string | null;
  json: ReviewStructured;
  createdAt: string;
};

function latestPath(args: { cycleId: string; token: string }) {
  return `artifacts/structured/${args.cycleId}/${args.token}/latest.json`;
}

function snapshotPath(args: { cycleId: string; token: string; timestamp: string }) {
  return `artifacts/structured/${args.cycleId}/${args.token}/${args.timestamp}.json`;
}

export async function saveStructuredReviewArtifact(args: {
  cycleId: string;
  token: string;
  nominationId: string;
  json: ReviewStructured;
}) {
  const createdAt = new Date().toISOString();
  const timestamp = makeArtifactTimestamp(new Date(createdAt));
  const artifact: StructuredReviewArtifact = {
    version: 1,
    cycleId: args.cycleId,
    token: args.token,
    nominationId: args.nominationId,
    model: process.env.OPENAI_MODEL ?? null,
    json: args.json,
    createdAt,
  };

  await putJson(latestPath({ cycleId: args.cycleId, token: args.token }), artifact, {
    allowOverwrite: true,
    required: true,
  });
  await putJson(
    snapshotPath({ cycleId: args.cycleId, token: args.token, timestamp }),
    artifact,
    { required: true },
  );

  return { timestamp, artifact };
}

export async function getLatestStructuredReviewArtifact(args: {
  cycleId: string;
  token: string;
}) {
  return getJson<StructuredReviewArtifact>(latestPath(args), { required: true });
}

