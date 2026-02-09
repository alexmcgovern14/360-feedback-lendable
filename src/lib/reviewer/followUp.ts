import { generateJson } from "@/lib/llm/client";
import { buildFollowUpPrompt } from "@/lib/llm/prompts";
import { FollowUpSchema } from "@/lib/schemas/followUp";

type InitialForm = {
  startDoing: string;
  stopDoing: string;
  continueDoing: string;
  anythingElse: string;
};

export function buildInitialMessage(form: InitialForm) {
  return [
    `Start doing: ${form.startDoing || "-"}`,
    `Stop doing: ${form.stopDoing || "-"}`,
    `Continue doing: ${form.continueDoing || "-"}`,
    `Anything else: ${form.anythingElse || "-"}`,
  ].join("\n");
}

export function pickFollowUpQuestion(form: InitialForm) {
  const candidates = [
    { key: "startDoing", label: "start doing", value: form.startDoing },
    { key: "stopDoing", label: "stop doing", value: form.stopDoing },
    { key: "continueDoing", label: "continue doing", value: form.continueDoing },
  ];

  const shortest = candidates.sort((a, b) => a.value.length - b.value.length)[0];

  if (!shortest || shortest.value.trim().length >= 80) {
    return null;
  }

  return `Could you add a concrete example for your ${shortest.label} feedback?`;
}

export const FOLLOWUP_TAGS = {
  FOLLOWUP_1: "[FOLLOWUP_1]",
  FOLLOWUP_2: "[FOLLOWUP_2]",
  FINAL_PROMPT: "[FINAL_PROMPT]",
} as const;

export const FINAL_PROMPT_TEXT = "Anything else you'd like to add?";

export type FollowUpStage = "followup1" | "followup2" | "final" | null;

export function tagFollowUp(content: string, tag: keyof typeof FOLLOWUP_TAGS) {
  return `${FOLLOWUP_TAGS[tag]} ${content}`;
}

export function stripFollowUpTags(content: string) {
  return content.replace(/\[(FOLLOWUP_1|FOLLOWUP_2|FINAL_PROMPT)\]\s*/g, "");
}

export function getFollowUpStage(content: string): FollowUpStage {
  if (content.includes(FOLLOWUP_TAGS.FOLLOWUP_1)) return "followup1";
  if (content.includes(FOLLOWUP_TAGS.FOLLOWUP_2)) return "followup2";
  if (content.includes(FOLLOWUP_TAGS.FINAL_PROMPT)) return "final";
  return null;
}

export function getNextFollowUpStage(assistantMessages: Array<{ content: string }>): "followup1" | "followup2" | "final" | "complete" {
  // Count tags across ALL assistant messages to determine what's been sent
  const allContent = assistantMessages.map((m) => m.content).join("\n");
  const hasFollowup1 = allContent.includes(FOLLOWUP_TAGS.FOLLOWUP_1);
  const hasFollowup2 = allContent.includes(FOLLOWUP_TAGS.FOLLOWUP_2);
  const hasFinalPrompt = allContent.includes(FOLLOWUP_TAGS.FINAL_PROMPT);
  const assistantCount = assistantMessages.length;

  // Deterministic progression: followup1 → followup2 → final → complete.
  // Count-based fallbacks handle legacy/untagged messages safely.
  if (hasFinalPrompt || assistantCount >= 3) return "complete";
  if (hasFollowup2 || assistantCount >= 2) return "final";
  if (hasFollowup1 || assistantCount >= 1) return "followup2";
  return "followup1";
}

export function formatTranscript(messages: Array<{ role: string; content: string }>) {
  return messages
    .map((message) => `${message.role}: ${stripFollowUpTags(message.content)}`)
    .join("\n");
}

export async function getFollowUpQuestion(args: {
  transcript: string;
  followUpIndex: 1 | 2;
  fallbackForm?: InitialForm;
}) {
  const fallbackQuestion =
    args.followUpIndex === 1 && args.fallbackForm
      ? pickFollowUpQuestion(args.fallbackForm) ??
        "Can you share a concrete example that illustrates this feedback?"
      : "Can you share a concrete example or specific project that illustrates this feedback?";

  const fallback = {
    question: fallbackQuestion,
    reason: "Fallback question to elicit more detail.",
  } as const;

  return generateJson({
    messages: [
      {
        role: "user",
        content: buildFollowUpPrompt({
          transcript: args.transcript,
          followUpIndex: args.followUpIndex,
        }),
      },
    ],
    schema: FollowUpSchema,
    fallback,
  });
}
