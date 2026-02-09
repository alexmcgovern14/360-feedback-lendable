import { NextResponse } from "next/server";
import { ChatRole, NominationStatus } from "@prisma/client";
import { loadReviewState, saveReviewState } from "@/lib/runtime/review-artifacts";
import { saveStructuredReviewArtifact } from "@/lib/runtime/structured-artifacts";
import { generateAndSaveCombinedArtifacts } from "@/lib/runtime/combined-artifacts";
import { prisma } from "@/lib/db";
import { combineReviews } from "@/lib/combined/combineReviews";
import { structureReview, structureReviewFromTranscript } from "@/lib/reviews/structureReview";
import {
  FINAL_PROMPT_TEXT,
  formatTranscript,
  getFollowUpQuestion,
  getNextFollowUpStage,
  tagFollowUp,
} from "@/lib/reviewer/followUp";

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
    const body = await request.json();
    const reviewerContent = body.skip
      ? "[Reviewer skipped the prompt.]"
      : (body.message ?? "");
    if (!reviewerContent.trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const assistantMessages = state.messages.filter((m) => m.role === "assistant");
    const nextStage = getNextFollowUpStage(assistantMessages);

    state.messages = [
      ...state.messages,
      { role: "reviewer", content: reviewerContent, at: now },
    ];

    if (nextStage === "complete") {
      state.messages = [
        ...state.messages,
        { role: "assistant", content: "Thanks — your review is now locked.", at: now },
      ];
      state.status = "SUBMITTED";
      state.updatedAt = now;
      await saveReviewState(state);

      const structured = await structureReviewFromTranscript({
        employeeName: state.employee.name,
        reviewerName: state.reviewer.name,
        relationshipType: state.relationshipType,
        collaborationFrequency: state.collaborationFrequency,
        transcriptMessages: state.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      await saveStructuredReviewArtifact({
        cycleId: state.cycleId,
        token: state.token,
        nominationId: state.nominationId,
        json: structured,
      });

      // Combined artifacts are generated once 2+ structured reviews exist.
      await generateAndSaveCombinedArtifacts(state.cycleId);
      return NextResponse.json({
        status: "complete",
        messages: state.messages,
        followUpsUsed: state.messages.filter((m) => m.role === "assistant").length,
      });
    }

    const transcript = formatTranscript(
      state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    );

    if (body.skip && (nextStage === "followup1" || nextStage === "followup2")) {
      const assistantContent = tagFollowUp(FINAL_PROMPT_TEXT, "FINAL_PROMPT");
      state.messages = [
        ...state.messages,
        { role: "assistant", content: assistantContent, at: now },
      ];
      state.updatedAt = now;
      await saveReviewState(state);
      return NextResponse.json({
        status: "chat",
        messages: state.messages,
        followUpsUsed: state.messages.filter((m) => m.role === "assistant").length,
      });
    }

    // Hard stop: exactly 2 follow-ups, then final, then complete
    // nextStage should never be "followup1" here since that's sent in start route
    // If it is, something went wrong - send followup2 as fallback
    let assistantContent = "";
    if (nextStage === "followup2") {
      const decision = await getFollowUpQuestion({
        transcript,
        followUpIndex: 2,
      });
      assistantContent = tagFollowUp(decision.question, "FOLLOWUP_2");
    } else if (nextStage === "final") {
      // Programmatic final question - no LLM call needed
      assistantContent = tagFollowUp(FINAL_PROMPT_TEXT, "FINAL_PROMPT");
    } else {
      // Fallback: if somehow we're at followup1 or complete, send final prompt
      // This should never happen, but ensures we don't loop forever
      assistantContent = tagFollowUp(FINAL_PROMPT_TEXT, "FINAL_PROMPT");
    }

    state.messages = [
      ...state.messages,
      { role: "assistant", content: assistantContent, at: now },
    ];
    state.updatedAt = now;
    await saveReviewState(state);

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

  // Fetch updated messages AFTER adding the reviewer message
  const updatedMessagesAfterReviewer = await prisma.chatMessage.findMany({
    where: { nominationId: nomination.id },
    orderBy: { createdAt: "asc" },
  });

  const assistantMessages = updatedMessagesAfterReviewer
    .filter((message) => message.role === ChatRole.ASSISTANT)
    .map((message) => ({ content: message.content }));
  const nextStage = getNextFollowUpStage(assistantMessages);

  if (nextStage === "complete") {
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

  // Use the already-fetched messages
  const transcript = formatTranscript(
    updatedMessagesAfterReviewer.map((message) => ({
      role: message.role.toLowerCase(),
      content: message.content,
    })),
  );

  if (body.skip && (nextStage === "followup1" || nextStage === "followup2")) {
    await prisma.chatMessage.create({
      data: {
        nominationId: nomination.id,
        role: ChatRole.ASSISTANT,
        content: tagFollowUp(FINAL_PROMPT_TEXT, "FINAL_PROMPT"),
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

  // Hard stop: exactly 2 follow-ups, then final, then complete
  // nextStage should never be "followup1" here since that's sent in start route
  let assistantContent = "";
  if (nextStage === "followup2") {
    const decision = await getFollowUpQuestion({
      transcript,
      followUpIndex: 2,
    });
    assistantContent = tagFollowUp(decision.question, "FOLLOWUP_2");
  } else if (nextStage === "final") {
    // Programmatic final question - no LLM call needed
    assistantContent = tagFollowUp(FINAL_PROMPT_TEXT, "FINAL_PROMPT");
  } else {
    // Fallback: if somehow we're at followup1 or complete, send final prompt
    // This should never happen, but ensures we don't loop forever
    assistantContent = tagFollowUp(FINAL_PROMPT_TEXT, "FINAL_PROMPT");
  }

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
