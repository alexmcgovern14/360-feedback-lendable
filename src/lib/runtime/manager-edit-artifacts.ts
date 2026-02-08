import { getJson, makeArtifactTimestamp, putJson } from "@/lib/blob-store";

export type ManagerCombinedStateArtifact = {
  version: 1;
  cycleId: string;
  status: "DRAFT" | "FINALISED";
  editedJson: unknown;
  updatedAt: string;
};

function latestPath(cycleId: string) {
  return `artifacts/manager/${cycleId}/latest.json`;
}

function snapshotPath(args: { cycleId: string; timestamp: string }) {
  return `artifacts/manager/${args.cycleId}/${args.timestamp}.json`;
}

export async function getLatestManagerCombinedState(cycleId: string) {
  return getJson<ManagerCombinedStateArtifact>(latestPath(cycleId));
}

export async function saveManagerCombinedState(args: {
  cycleId: string;
  status: "DRAFT" | "FINALISED";
  editedJson: unknown;
}) {
  const updatedAt = new Date().toISOString();
  const timestamp = makeArtifactTimestamp(new Date(updatedAt));
  const artifact: ManagerCombinedStateArtifact = {
    version: 1,
    cycleId: args.cycleId,
    status: args.status,
    editedJson: args.editedJson,
    updatedAt,
  };

  await putJson(latestPath(args.cycleId), artifact, { allowOverwrite: true });
  await putJson(snapshotPath({ cycleId: args.cycleId, timestamp }), artifact);

  return artifact;
}

