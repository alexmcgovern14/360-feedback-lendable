export const SYSTEM_GUARDRAILS = `
You are assisting with 360 feedback summarisation.
- Never invent facts or exaggerate intent.
- Preserve meaning; use the reviewer’s words when possible.
- Evidence must be direct quotes from the transcript.
- If information is missing, ask for it explicitly and concisely.
`;

export function buildFollowUpPrompt(args: {
  transcript: string;
  followUpIndex: 1 | 2;
}) {
  const isSecond = args.followUpIndex === 2;
  const secondInstruction = isSecond
    ? `
This is the SECOND follow-up. The transcript already contains the first follow-up question and the reviewer's answer.
You MUST ask about a DIFFERENT area of their feedback. Do not repeat or rephrase the first question.
- If the first question focused on "Continue doing" or strengths, ask about "Start doing" or "Stop doing" (or vice versa).
- If it focused on one of Start/Stop/Continue, ask for more detail or examples on another.
Your goal is to get concrete examples or detail on a part of their feedback that has not yet been explored.
`
    : `
Your goal is to elicit more detail, concrete examples, and specific projects.
The reviewer may have said something like "high quality work" or "great partner".
Ask what specifically makes it high quality and for an example project.
`;

  return `
${SYSTEM_GUARDRAILS}
You are helping a reviewer improve their feedback. Ask ONE follow-up question.
${secondInstruction}

Return ONLY valid JSON with:
{
  "question": string,
  "reason": string
}

Follow-up number: ${args.followUpIndex} of 2
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
