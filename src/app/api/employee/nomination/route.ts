import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CollaborationFrequency, RelationshipType } from "@prisma/client";
import { assertBlobConfigured } from "@/lib/blob-store";
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
    try {
      assertBlobConfigured();
      const cycle = getFirstCycle();
      if (!cycle) {
        return NextResponse.json({ error: "No review cycle" }, { status: 404 });
      }
      const { addRuntimeNomination } = await import(
        "@/lib/runtime/employee-nominations"
      );
      const { id: nominationId } = await addRuntimeNomination(cycle.id, {
        reviewerId,
        relationshipType,
        collaborationFrequency,
      });
      const { getFirstCycleWithRuntime } = await import(
        "@/lib/runtime/employee-nominations"
      );
      const cycleWithRuntime = await getFirstCycleWithRuntime();
      const reviewerCount = cycleWithRuntime?.nominations.length ?? 0;
      revalidatePath("/employee");
      return NextResponse.json({
        ok: true,
        nominationId,
        reviewerCount,
        persisted: true,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to persist reviewer nomination.",
          persisted: false,
        },
        { status: 500 },
      );
    }
  }

  try {
    const cycle = await prisma.reviewCycle.findFirst();
    if (!cycle) {
      return NextResponse.json({ error: "No review cycle" }, { status: 404 });
    }

    const existing = await prisma.nomination.findFirst({
      where: { cycleId: cycle.id, reviewerId, isSeed: false },
    });

    if (existing) {
      const totalCount = await prisma.nomination.count({
        where: { cycleId: cycle.id, isSeed: false },
      });
      return NextResponse.json({
        ok: true,
        nominationId: existing.id,
        reviewerCount: totalCount,
        persisted: true,
      });
    }

    const nomination = await prisma.nomination.create({
      data: {
        cycleId: cycle.id,
        reviewerId,
        relationshipType,
        collaborationFrequency,
        requestToken: randomUUID(),
        isSeed: false,
      },
    });

    // Get the updated count to send back to client
    const totalCount = await prisma.nomination.count({
      where: { cycleId: cycle.id, isSeed: false },
    });

    // Revalidate the employee page to show the new nomination
    revalidatePath("/employee");
    
    return NextResponse.json({
      ok: true,
      nominationId: nomination.id,
      reviewerCount: totalCount,
      persisted: true,
    });
  } catch (error) {
    console.error("Database error in nomination API:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Database error while adding reviewer.",
        persisted: false,
      },
      { status: 500 },
    );
  }
}
