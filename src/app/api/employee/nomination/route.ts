import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { CollaborationFrequency, RelationshipType } from "@prisma/client";
import { getFirstCycle } from "@/lib/json-data";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { reviewerId, relationshipType, collaborationFrequency } = body ?? {};

  if (!reviewerId) {
    return NextResponse.json({ error: "Missing reviewerId" }, { status: 400 });
  }

  if (!Object.values(RelationshipType).includes(relationshipType)) {
    return NextResponse.json({ error: "Invalid relationshipType" }, { status: 400 });
  }

  if (
    !Object.values(CollaborationFrequency).includes(collaborationFrequency)
  ) {
    return NextResponse.json(
      { error: "Invalid collaborationFrequency" },
      { status: 400 },
    );
  }

  if (process.env.USE_JSON_DATA === "true") {
    const cycle = getFirstCycle();
    if (!cycle) {
      return NextResponse.json({ error: "No review cycle" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, nominationId: "demo-nomination-id" });
  }

  const cycle = await prisma.reviewCycle.findFirst();
  if (!cycle) {
    return NextResponse.json({ error: "No review cycle" }, { status: 404 });
  }

  const existing = await prisma.nomination.findFirst({
    where: { cycleId: cycle.id, reviewerId },
  });

  if (existing) {
    return NextResponse.json({ ok: true, nominationId: existing.id });
  }

  const nomination = await prisma.nomination.create({
    data: {
      cycleId: cycle.id,
      reviewerId,
      relationshipType,
      collaborationFrequency,
      requestToken: randomUUID(),
    },
  });

  return NextResponse.json({ ok: true, nominationId: nomination.id });
}
