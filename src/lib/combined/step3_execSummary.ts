import { generateJson } from "@/lib/llm/client";
import { buildExecutiveSummaryPrompt } from "@/lib/llm/prompts";
import { Step3Schema, type Step2Result, type Step3Result } from "@/lib/schemas/combined";

export async function step3ExecutiveSummary(
  synthesis: Step2Result,
): Promise<Step3Result> {
  const fallback: Step3Result = {
    executive_summary: `This summary highlights ${synthesis.start_doing.length} start-doing, ${synthesis.stop_doing.length} stop-doing, and ${synthesis.continue_doing.length} continue-doing themes, prioritised using relationship type, collaboration frequency, and confidence.`,
    ...synthesis,
  };

  return generateJson({
    messages: [
      {
        role: "user",
        content: buildExecutiveSummaryPrompt({ synthesis }),
      },
    ],
    schema: Step3Schema,
    fallback,
  });
}
