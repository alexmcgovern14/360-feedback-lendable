import { ChatRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateJson } from "@/lib/llm/client";
import { buildStructurePrompt } from "@/lib/llm/prompts";
import type { ReviewStructured } from "@/lib/schemas/reviewStructured";
import { ReviewStructuredSchema } from "@/lib/schemas/reviewStructured";
import { formatTranscript } from "@/lib/reviewer/followUp";

const extractSection = (content: string, label: string) => {
  const line = content
    .split("\n")
    .find((entry) => entry.toLowerCase().startsWith(label.toLowerCase()));
  if (!line) return "";
  return line.replace(new RegExp(`^${label}\\s*`, "i"), "").trim();
};

export async function structureReviewFromTranscript(args: {
  employeeName: string;
  reviewerName: string;
  relationshipType: string;
  collaborationFrequency: string;
  transcriptMessages: Array<{ role: "reviewer" | "assistant" | "system"; content: string }>;
}): Promise<ReviewStructured> {
  const transcriptText = formatTranscript(args.transcriptMessages);
  const firstReviewerMessage =
    args.transcriptMessages.find((message) => message.role === "reviewer")?.content ??
    "";

  const startDoing = extractSection(firstReviewerMessage, "Start doing:");
  const stopDoing = extractSection(firstReviewerMessage, "Stop doing:");
  const continueDoing = extractSection(firstReviewerMessage, "Continue doing:");

  const fallback: ReviewStructured = {
    metadata: {
      employee: args.employeeName,
      reviewer: args.reviewerName,
      relationship_type: String(args.relationshipType),
      collaboration_frequency: String(args.collaborationFrequency),
    },
    start_doing: startDoing
      ? [
          {
            insight: "Start doing (reviewer input)",
            description: `Reviewer stated: "${startDoing}"`,
            evidence: `"${startDoing}"`,
            confidence_rating: 3,
          },
        ]
      : [],
    stop_doing: stopDoing
      ? [
          {
            insight: "Stop doing (reviewer input)",
            description: `Reviewer stated: "${stopDoing}"`,
            evidence: `"${stopDoing}"`,
            confidence_rating: 3,
          },
        ]
      : [],
    continue_doing: continueDoing
      ? [
          {
            insight: "Continue doing (reviewer input)",
            description: `Reviewer stated: "${continueDoing}"`,
            evidence: `"${continueDoing}"`,
            confidence_rating: 3,
          },
        ]
      : [],
    full_transcript: args.transcriptMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  return generateJson({
    messages: [
      {
        role: "user",
        content: buildStructurePrompt({
          metadata: {
            employee: args.employeeName,
            reviewer: args.reviewerName,
            relationshipType: args.relationshipType,
            collaborationFrequency: args.collaborationFrequency,
          },
          transcript: transcriptText,
        }),
      },
    ],
    schema: ReviewStructuredSchema,
    fallback,
  });
}

export async function structureReview(nominationId: string) {
  const nomination = await prisma.nomination.findUnique({
    where: { id: nominationId },
    include: {
      reviewer: true,
      cycle: { include: { employee: true } },
      chatMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!nomination) return null;

  const transcriptMessages = nomination.chatMessages.map((message) => ({
    role: (
      message.role === ChatRole.ASSISTANT
        ? "assistant"
        : message.role === ChatRole.SYSTEM
          ? "system"
          : "reviewer"
    ) as "reviewer" | "assistant" | "system",
    content: message.content,
  }));

  const structured = await structureReviewFromTranscript({
    employeeName: nomination.cycle.employee.name,
    reviewerName: nomination.reviewer.name,
    relationshipType: String(nomination.relationshipType),
    collaborationFrequency: String(nomination.collaborationFrequency),
    transcriptMessages,
  });

  const saved = await prisma.reviewStructured.upsert({
    where: { nominationId: nomination.id },
    update: {
      json: structured,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    },
    create: {
      nominationId: nomination.id,
      json: structured,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    },
  });

  return saved;
}
