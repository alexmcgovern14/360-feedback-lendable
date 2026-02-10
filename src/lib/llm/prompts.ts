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

CRITICAL RULE: You MUST ask about a COMPLETELY DIFFERENT area than the first follow-up.
- Read the transcript carefully to identify which area (Start/Stop/Continue) the first follow-up question was about
- If the first follow-up asked about "Start doing", you MUST ask about "Stop doing" OR "Continue doing"
- If the first follow-up asked about "Stop doing", you MUST ask about "Start doing" OR "Continue doing"  
- If the first follow-up asked about "Continue doing", you MUST ask about "Start doing" OR "Stop doing"
- NEVER ask about the same area twice
- NEVER invent new projects or behaviors - only ask for detail on what they already mentioned
- If one area is "-" or empty in their original feedback, choose from the remaining two areas
- Your goal is to get concrete examples or detail on a DIFFERENT part of their feedback that has not yet been explored
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
Write a detailed synthesis for each selected insight cluster.

Guidelines:
- Each synthesis should be 2-4 sentences that thoroughly explain the theme
- Include specific details from the evidence (projects, situations, impacts mentioned)
- Synthesize information from ALL sources in the cluster, not just one
- Make it concrete and actionable - managers should understand exactly what to discuss
- Cite the most compelling evidence quotes to support the synthesis
- Use professional British English throughout

The synthesis should be substantially more detailed than a single source description.
If multiple reviewers mentioned the same theme, weave their perspectives together.

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
