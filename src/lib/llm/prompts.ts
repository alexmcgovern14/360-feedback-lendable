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
  
  const baseInstruction = `
The transcript contains the reviewer's initial feedback in this format:
- "Start doing: [feedback]"
- "Stop doing: [feedback]"
- "Continue doing: [feedback]"
- "Anything else: [feedback]"

Your follow-up question MUST:
1. Reference EXACTLY ONE of these three areas: "Start doing", "Stop doing", or "Continue doing"
2. Ask for SPECIFIC DETAIL about what the reviewer already mentioned in that area:
   - Concrete examples (what happened, when, where)
   - Impact (what was the effect or outcome)
   - Context (project name, situation, frequency if relevant)
3. NEVER ask about how the REVIEWER could improve (this feedback is about the EMPLOYEE)
4. NEVER introduce a new project, behavior, or topic unless the reviewer explicitly mentioned it
5. Focus on getting more depth on what they already said, not discovering new things

If the reviewer said something vague like "high quality work", ask what specifically made it high quality and for a concrete example.
If they mentioned a project, ask for specific details about what happened in that project.
`;

  const secondInstruction = isSecond
    ? `
This is the SECOND follow-up. The transcript already contains the first follow-up question and the reviewer's answer.

CRITICAL: You MUST ask about a DIFFERENT area than the first follow-up.
- Identify which area (Start/Stop/Continue) the first follow-up targeted
- Choose a DIFFERENT area from the three (Start/Stop/Continue)
- If one area is "-" or empty, you can choose from the remaining two
- If two areas are empty, you can ask for more detail on the remaining one
- Your goal is to get concrete examples or detail on a part of their feedback that has not yet been explored in follow-ups
`
    : `
Choose ONE of the three areas (Start/Stop/Continue) that would benefit most from more detail.
Prioritize areas where the reviewer gave brief or vague feedback that could use concrete examples.
`;

  return `
${SYSTEM_GUARDRAILS}
You are helping a reviewer improve their feedback. Ask ONE follow-up question.

${baseInstruction}

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
