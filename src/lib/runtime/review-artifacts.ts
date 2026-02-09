import { getNominationByToken } from "@/lib/json-data";
import { getJson, makeArtifactTimestamp, putJson } from "@/lib/blob-store";

export type RuntimeChatMessage = {
  role: "reviewer" | "assistant";
  content: string;
  at: string;
};

export type ReviewRuntimeState = {
  version: 1;
  token: string;
  cycleId: string;
  nominationId: string;
  status: "REQUESTED" | "SUBMITTED";
  reviewer: { id: string; name: string };
  employee: { id: string; name: string };
  relationshipType: string;
  collaborationFrequency: string;
  messages: RuntimeChatMessage[];
  createdAt: string;
  updatedAt: string;
};

function statePath(args: { cycleId: string; token: string }) {
  return `artifacts/reviews/${args.cycleId}/${args.token}/state.json`;
}

function snapshotPath(args: { cycleId: string; token: string; timestamp: string }) {
  return `artifacts/reviews/${args.cycleId}/${args.token}/${args.timestamp}.json`;
}

function deriveFromSeed(token: string): ReviewRuntimeState | null {
  const nomination = getNominationByToken(token);
  if (!nomination) return null;

  return {
    version: 1,
    token,
    cycleId: nomination.cycleId,
    nominationId: nomination.id,
    status: (nomination.status as "REQUESTED" | "SUBMITTED") ?? "REQUESTED",
    reviewer: { id: nomination.reviewer.id, name: nomination.reviewer.name },
    employee: {
      id: nomination.cycle.employee.id,
      name: nomination.cycle.employee.name,
    },
    relationshipType: nomination.relationshipType,
    collaborationFrequency: nomination.collaborationFrequency,
    messages: nomination.chatMessages.map((m) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "reviewer",
      content: m.content,
      at: m.createdAt,
    })),
    createdAt: nomination.createdAt,
    updatedAt: nomination.updatedAt,
  };
}

export async function loadReviewState(token: string): Promise<ReviewRuntimeState | null> {
  const seed = deriveFromSeed(token);
  if (!seed) return null;

  const stored = await getJson<ReviewRuntimeState>(
    statePath({ cycleId: seed.cycleId, token }),
    { required: true },
  );
  return stored ?? seed;
}

export async function saveReviewState(state: ReviewRuntimeState) {
  const timestamp = makeArtifactTimestamp(new Date(state.updatedAt));

  await putJson(statePath({ cycleId: state.cycleId, token: state.token }), state, {
    allowOverwrite: true,
    required: true,
  });
  await putJson(
    snapshotPath({ cycleId: state.cycleId, token: state.token, timestamp }),
    state,
    { required: true },
  );

  return { timestamp };
}

