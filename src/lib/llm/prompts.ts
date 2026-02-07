export const SYSTEM_GUARDRAILS = `
You are assisting with 360 feedback summarisation.
- Never invent facts or exaggerate intent.
- Preserve meaning; use the reviewer’s words when possible.
- Evidence must be direct quotes from the transcript.
- If information is missing, ask for it explicitly and concisely.
`;

export function buildFollowUpPrompt(args: {
  transcript: string;
  maxQuestionsRemaining: number;
}) {
  return `
${SYSTEM_GUARDRAILS}
You are helping a reviewer improve their feedback. You may ask at most one question.
If enough detail is already present, respond with action = "enough".

Return ONLY valid JSON with:
{
  "action": "ask" | "enough",
  "question": string | null,
  "reason": string
}

Max questions remaining: ${args.maxQuestionsRemaining}
Transcript:
${args.transcript}
`;
}

export function buildStructurePrompt(args: {
  metadata: {
    employee: string;
    reviewer: string;
    relationshipType: string;
    collaborationFrequency: string;
  };
  transcript: string;
}) {
  return `
${SYSTEM_GUARDRAILS}
Summarise the reviewer transcript into structured feedback.
Use professional British English. Be faithful and avoid over-interpretation.
Descriptions should be concise synthesis; evidence must be direct quotes.
Confidence rating is 0–5 based on emphasis and evidence.

Return ONLY valid JSON matching the required schema.

Metadata:
Employee: ${args.metadata.employee}
Reviewer: ${args.metadata.reviewer}
Relationship type: ${args.metadata.relationshipType}
Collaboration frequency: ${args.metadata.collaborationFrequency}

Transcript:
${args.transcript}
`;
}

export function buildClusterPrompt(args: { insights: unknown }) {
  return `
${SYSTEM_GUARDRAILS}
Cluster similar insights, prioritise them, and select up to 3 per section.
Use the weighting signals to justify prioritisation. Keep the original source insights intact.

Return ONLY valid JSON matching the required schema.

Insights:
${JSON.stringify(args.insights, null, 2)}
`;
}

export function buildSynthesisPrompt(args: { primary: unknown }) {
  return `
${SYSTEM_GUARDRAILS}
Write a short synthesis for each selected insight cluster.
Use professional British English and cite evidence quotes directly.
Return ONLY valid JSON matching the required schema.

Primary clusters:
${JSON.stringify(args.primary, null, 2)}
`;
}

export function buildExecutiveSummaryPrompt(args: { synthesis: unknown }) {
  return `
${SYSTEM_GUARDRAILS}
Write a concise executive summary (3–5 sentences) of the combined review.
Use professional British English and avoid over-interpretation.
Return ONLY valid JSON matching the required schema.

Syntheses:
${JSON.stringify(args.synthesis, null, 2)}
`;
}
