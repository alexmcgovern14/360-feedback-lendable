import { NextResponse } from "next/server";
import { CombinedReviewStatus, ReviewCycleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const action = body?.action as "save" | "finalise";
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
