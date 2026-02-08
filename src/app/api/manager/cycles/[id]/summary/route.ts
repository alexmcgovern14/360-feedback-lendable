import { NextResponse } from "next/server";
import { CombinedReviewStatus, ReviewCycleStatus } from "@prisma/client";
import { getLatestCombinedArtifacts } from "@/lib/runtime/combined-artifacts";
import { saveManagerCombinedState } from "@/lib/runtime/manager-edit-artifacts";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const action = body?.action as "save" | "finalise";

  if (process.env.USE_JSON_DATA === "true") {
    const combined = await getLatestCombinedArtifacts(id);
    if (!combined) {
      return NextResponse.json(
        { error: "Combined review not found (need 2+ submitted reviews)" },
        { status: 404 },
      );
    }

    const editedJson = body?.editedJson ?? null;
    if (!editedJson) {
      return NextResponse.json({ error: "Missing editedJson" }, { status: 400 });
    }

    if (action === "save") {
      await saveManagerCombinedState({ cycleId: id, status: "DRAFT", editedJson });
      return NextResponse.json({ ok: true });
    }

    if (action === "finalise") {
      await saveManagerCombinedState({ cycleId: id, status: "FINALISED", editedJson });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const editedJson = body?.editedJson ?? null;
  const combined = await prisma.combinedReview.findUnique({
    where: { cycleId: id },
  });

  if (!combined) {
    return NextResponse.json({ error: "Combined review not found" }, { status: 404 });
  }

  if (action === "save") {
    await prisma.combinedReview.update({
      where: { cycleId: id },
      data: { editedJson },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "finalise") {
    await prisma.combinedReview.update({
      where: { cycleId: id },
      data: { editedJson, status: CombinedReviewStatus.FINALISED },
    });

    await prisma.reviewCycle.update({
      where: { id },
      data: { status: ReviewCycleStatus.FINALISED },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
