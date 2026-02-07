import { NextResponse } from "next/server";
import { ChatRole, NominationStatus } from "@prisma/client";
import { getNominationByToken } from "@/lib/json-data";
import { prisma } from "@/lib/db";
import { combineReviews } from "@/lib/combined/combineReviews";
import { structureReview } from "@/lib/reviews/structureReview";
import { formatTranscript, getFollowUpDecision } from "@/lib/reviewer/followUp";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (process.env.USE_JSON_DATA === "true") {
    const nomination = getNominationByToken(token);
    if (!nomination) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (nomination.status === "SUBMITTED") {
      return NextResponse.json({
        status: "complete",
        messages: nomination.chatMessages.map((message) => ({
          role: message.role === "ASSISTANT" ? "assistant" : "reviewer",
          content: message.content,
        })),
        followUpsUsed: nomination.chatMessages.filter(
          (message) => message.role === "ASSISTANT",
        ).length,
      });
    }
    const body = await request.json();
    const reviewerContent = body.skip
      ? "[Reviewer skipped the prompt.]"
      : (body.message ?? "");
    if (!reviewerContent.trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }
    const assistantCount = nomination.chatMessages.filter(
      (m) => m.role === "ASSISTANT",
    ).length;
    const messages = [
      ...nomination.chatMessages.map((message) => ({
        role: (message.role === "ASSISTANT" ? "assistant" : "reviewer") as "reviewer" | "assistant",
        content: message.content,
      })),
      { role: "reviewer" as const, content: reviewerContent },
      { role: "assistant" as const, content: "Thanks — your review is now locked." },
    ];
    return NextResponse.json({
      status: "complete",
      messages,
      followUpsUsed: assistantCount + 1,
    });
  }

  const nomination = await prisma.nomination.findUnique({
    where: { requestToken: token },
    include: { chatMessages: { orderBy: { createdAt: "asc" } } },
  });

  if (!nomination) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (nomination.status === NominationStatus.SUBMITTED) {
    return NextResponse.json({
      status: "complete",
      messages: nomination.chatMessages.map((message) => ({
        role: message.role === ChatRole.ASSISTANT ? "assistant" : "reviewer",
        content: message.content,
      })),
      followUpsUsed: nomination.chatMessages.filter(
        (message) => message.role === ChatRole.ASSISTANT,
      ).length,
    });
  }

  const body = await request.json();
  const reviewerContent = body.skip
    ? "[Reviewer skipped the prompt.]"
    : (body.message ?? "");

  if (!reviewerContent.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  await prisma.chatMessage.create({
    data: {
      nominationId: nomination.id,
      role: ChatRole.REVIEWER,
      content: reviewerContent,
    },
  });

  const assistantMessages = nomination.chatMessages.filter(
    (message) => message.role === ChatRole.ASSISTANT,
  );
  const lastAssistant = assistantMessages.at(-1)?.content ?? "";

  if (lastAssistant.toLowerCase().includes("any final comments")) {
    await prisma.chatMessage.create({
      data: {
        nominationId: nomination.id,
        role: ChatRole.ASSISTANT,
        content: "Thanks — your review is now locked.",
      },
    });

    await prisma.nomination.update({
      where: { id: nomination.id },
      data: { status: NominationStatus.SUBMITTED },
    });

    await structureReview(nomination.id);
    await combineReviews(nomination.cycleId);

    const finalMessages = await prisma.chatMessage.findMany({
      where: { nominationId: nomination.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      status: "complete",
      messages: finalMessages.map((message) => ({
        role: message.role === ChatRole.ASSISTANT ? "assistant" : "reviewer",
        content: message.content,
      })),
      followUpsUsed: finalMessages.filter(
        (message) => message.role === ChatRole.ASSISTANT,
      ).length,
    });
  }

  const followUpsUsed = assistantMessages.length;
  const updatedTranscript = await prisma.chatMessage.findMany({
    where: { nominationId: nomination.id },
    orderBy: { createdAt: "asc" },
  });

  const decision = await getFollowUpDecision({
    transcript: formatTranscript(
      updatedTranscript.map((message) => ({
        role: message.role.toLowerCase(),
        content: message.content,
      })),
    ),
    maxQuestionsRemaining: Math.max(0, 3 - followUpsUsed),
  });

  const assistantContent =
    decision.action === "ask" && decision.question
      ? decision.question
      : "Thanks, I have enough detail — any final comments?";

  await prisma.chatMessage.create({
    data: {
      nominationId: nomination.id,
      role: ChatRole.ASSISTANT,
      content: assistantContent,
    },
  });

  const updatedMessages = await prisma.chatMessage.findMany({
    where: { nominationId: nomination.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    status: "chat",
    messages: updatedMessages.map((message) => ({
      role: message.role === ChatRole.ASSISTANT ? "assistant" : "reviewer",
      content: message.content,
    })),
    followUpsUsed: updatedMessages.filter(
      (message) => message.role === ChatRole.ASSISTANT,
    ).length,
  });
}
