import { NextResponse } from "next/server";
import { getLatestCombinedArtifacts } from "@/lib/runtime/combined-artifacts";
import { getLatestManagerCombinedState } from "@/lib/runtime/manager-edit-artifacts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.USE_JSON_DATA !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { id } = await params;
  const combined = await getLatestCombinedArtifacts(id);
  const manager = await getLatestManagerCombinedState(id);

  return NextResponse.json({ combined, manager });
}

