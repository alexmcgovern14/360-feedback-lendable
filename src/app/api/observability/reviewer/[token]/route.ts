import { NextResponse } from "next/server";
import { loadReviewState } from "@/lib/runtime/review-artifacts";
import { getLatestStructuredReviewArtifact } from "@/lib/runtime/structured-artifacts";
import { getLatestCombinedArtifacts } from "@/lib/runtime/combined-artifacts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (process.env.USE_JSON_DATA !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { token } = await params;
  const review = await loadReviewState(token);
  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const structured = await getLatestStructuredReviewArtifact({
    cycleId: review.cycleId,
    token,
  });
  const combined = await getLatestCombinedArtifacts(review.cycleId);

  return NextResponse.json({ review, structured, combined });
}

