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

export function formatTranscript(messages: Array<{ role: string; content: string }>) {
  return messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

export async function getFollowUpDecision(args: {
  transcript: string;
  maxQuestionsRemaining: number;
  fallbackForm?: InitialForm;
}) {
  const fallbackQuestion = args.fallbackForm
    ? pickFollowUpQuestion(args.fallbackForm)
    : null;

  const fallback = {
    action: fallbackQuestion ? "ask" : "enough",
    question: fallbackQuestion,
    reason: "Fallback heuristic based on missing detail.",
  } as const;

  return generateJson({
    messages: [
      {
        role: "user",
        content: buildFollowUpPrompt({
          transcript: args.transcript,
          maxQuestionsRemaining: args.maxQuestionsRemaining,
        }),
      },
    ],
    schema: FollowUpSchema,
    fallback,
  });
}
