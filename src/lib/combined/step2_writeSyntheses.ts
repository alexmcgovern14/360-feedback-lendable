import { generateJson } from "@/lib/llm/client";
import { buildSynthesisPrompt } from "@/lib/llm/prompts";
import { Step2Schema, type Step2Result, type Step1Result } from "@/lib/schemas/combined";

type SectionKey = "start_doing" | "stop_doing" | "continue_doing";

const sectionKeys: SectionKey[] = ["start_doing", "stop_doing", "continue_doing"];

export async function step2WriteSyntheses(
  primary: Step1Result["primary"],
): Promise<Step2Result> {
  const fallback: Step2Result = {
    start_doing: [],
    stop_doing: [],
    continue_doing: [],
  };

  for (const section of sectionKeys) {
    fallback[section] = primary[section].map((cluster) => {
      const firstSource = cluster.sources[0];
      const evidenceQuotes = cluster.sources
        .map((source) => source.evidence)
        .filter(Boolean)
        .slice(0, 2);

      return {
        title: cluster.title,
        synthesis: firstSource
          ? `Reviewers noted: ${firstSource.description}`
          : "Reviewers noted this theme across feedback.",
        why_prioritized: cluster.why_prioritized,
        evidence_quotes: evidenceQuotes,
      };
    });
  }

  return generateJson({
    messages: [
      {
        role: "user",
        content: buildSynthesisPrompt({ primary }),
      },
    ],
    schema: Step2Schema,
    fallback,
  });
}
