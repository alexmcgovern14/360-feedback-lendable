import { randomUUID } from "node:crypto";
import { getFirstCycle, getPeople } from "@/lib/json-data";
import { getJson, putJson } from "@/lib/blob-store";

export type RuntimeNomination = {
  id: string;
  cycleId: string;
  reviewerId: string;
  requestToken: string;
  relationshipType: string;
  collaborationFrequency: string;
  status: "REQUESTED";
  createdAt: string;
  updatedAt: string;
};

const NOMINATIONS_KEY = (cycleId: string) =>
  `artifacts/employee/${cycleId}/nominations.json`;

export async function loadRuntimeNominations(
  cycleId: string,
): Promise<RuntimeNomination[]> {
  const data = await getJson<{ nominations: RuntimeNomination[] }>(
    NOMINATIONS_KEY(cycleId),
  );
  return data?.nominations ?? [];
}

export async function addRuntimeNomination(
  cycleId: string,
  args: {
    reviewerId: string;
    relationshipType: string;
    collaborationFrequency: string;
  },
): Promise<{ id: string; requestToken: string; reviewerCount: number }> {
  const existing = await loadRuntimeNominations(cycleId);
  if (existing.some((n) => n.reviewerId === args.reviewerId)) {
    const n = existing.find((n) => n.reviewerId === args.reviewerId)!;
    return {
      id: n.id,
      requestToken: n.requestToken,
      reviewerCount: existing.length,
    };
  }
  const now = new Date().toISOString();
  const nomination: RuntimeNomination = {
    id: `runtime-${randomUUID()}`,
    cycleId,
    reviewerId: args.reviewerId,
    requestToken: randomUUID(),
    relationshipType: args.relationshipType,
    collaborationFrequency: args.collaborationFrequency,
    status: "REQUESTED",
    createdAt: now,
    updatedAt: now,
  };
  await putJson(
    NOMINATIONS_KEY(cycleId),
    {
      nominations: [...existing, nomination],
    },
    { allowOverwrite: true, required: true },
  );
  const refreshed = await loadRuntimeNominations(cycleId);
  const persisted = refreshed.some((n) => n.id === nomination.id);
  if (!persisted) {
    throw new Error("Reviewer nomination was not persisted.");
  }
  return {
    id: nomination.id,
    requestToken: nomination.requestToken,
    reviewerCount: refreshed.length,
  };
}

export type CycleWithNominations = Awaited<ReturnType<typeof getFirstCycle>> & {
  nominations: Array<{
    id: string;
    cycleId: string;
    reviewerId: string;
    requestToken: string;
    relationshipType: string;
    collaborationFrequency: string;
    status: string;
    reviewer: { id: string; name: string };
  }>;
};

export async function getFirstCycleWithRuntime(): Promise<CycleWithNominations | null> {
  const cycle = getFirstCycle();
  if (!cycle) return null;
  const people = getPeople();
  const personById = (id: string) => people.find((p) => p.id === id)!;
  const runtime = await loadRuntimeNominations(cycle.id);
  const runtimeNominations = runtime
    .map((n) => {
      const reviewer = personById(n.reviewerId);
      if (!reviewer) return null;
      return {
        ...n,
        reviewer: { id: reviewer.id, name: reviewer.name },
      };
    })
    .filter(Boolean) as CycleWithNominations["nominations"];
  const seedNominations = cycle.nominations;
  const merged = [...seedNominations, ...runtimeNominations];
  return {
    ...cycle,
    nominations: merged,
  };
}
