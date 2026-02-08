import { NextResponse } from "next/server";
import { ChatRole, NominationStatus } from "@prisma/client";
import { loadReviewState, saveReviewState } from "@/lib/runtime/review-artifacts";
import { prisma } from "@/lib/db";
import { buildInitialMessage, getFollowUpDecision } from "@/lib/reviewer/followUp";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (process.env.USE_JSON_DATA === "true") {
    const state = await loadReviewState(token);
    if (!state) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (state.status === "SUBMITTED") {
      return NextResponse.json({
        status: "complete",
        messages: state.messages,
        followUpsUsed: state.messages.filter((m) => m.role === "assistant").length,
      });
    }
    if (state.messages.length === 0) {
      const form = await request.json();
      const initialMessage = buildInitialMessage({
        startDoing: form.startDoing ?? "",
        stopDoing: form.stopDoing ?? "",
        continueDoing: form.continueDoing ?? "",
        anythingElse: form.anythingElse ?? "",
      });
      const decision = await getFollowUpDecision({
        transcript: initialMessage,
        maxQuestionsRemaining: 3,
        fallbackForm: {
          startDoing: form.startDoing ?? "",
          stopDoing: form.stopDoing ?? "",
          continueDoing: form.continueDoing ?? "",
          anythingElse: form.anythingElse ?? "",
        },
      });
      const assistantContent =
        decision.action === "ask" && decision.question
          ? decision.question
          : "Thanks, I have enough detail — any final comments?";

      const now = new Date().toISOString();
      state.messages = [
        { role: "reviewer", content: initialMessage, at: now },
        { role: "assistant", content: assistantContent, at: now },
      ];
      state.updatedAt = now;
      if (!state.createdAt) state.createdAt = now;
      await saveReviewState(state);

      return NextResponse.json({
        status: "chat",
        messages: state.messages,
        followUpsUsed: state.messages.filter((m) => m.role === "assistant").length,
      });
    }
    return NextResponse.json({
      status: "chat",
      messages: state.messages,
      followUpsUsed: state.messages.filter((m) => m.role === "assistant").length,
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

  if (nomination.chatMessages.length === 0) {
    const form = await request.json();
    const initialMessage = buildInitialMessage({
      startDoing: form.startDoing ?? "",
      stopDoing: form.stopDoing ?? "",
      continueDoing: form.continueDoing ?? "",
      anythingElse: form.anythingElse ?? "",
    });

    await prisma.chatMessage.create({
      data: {
        nominationId: nomination.id,
        role: ChatRole.REVIEWER,
        content: initialMessage,
      },
    });

    const decision = await getFollowUpDecision({
      transcript: initialMessage,
      maxQuestionsRemaining: 3,
      fallbackForm: {
        startDoing: form.startDoing ?? "",
        stopDoing: form.stopDoing ?? "",
        continueDoing: form.continueDoing ?? "",
        anythingElse: form.anythingElse ?? "",
      },
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
  }

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
