import OpenAI from "openai";
import { z } from "zod";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GenerateTextParams = {
  messages: LlmMessage[];
  temperature?: number;
  fallback?: string;
};

type GenerateJsonParams<T> = {
  messages: LlmMessage[];
  schema: z.ZodSchema<T>;
  temperature?: number;
  fallback: T;
};

const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const hasKey = Boolean(process.env.OPENAI_API_KEY);

const openai = hasKey
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const stripJson = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/```(?:json)?/g, "").trim();
  }
  return trimmed;
};

export async function generateText({
  messages,
  temperature = 0.2,
  fallback = "",
}: GenerateTextParams) {
  if (!openai) return fallback;

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
  });

  return response.choices[0]?.message?.content?.trim() ?? fallback;
}

export async function generateJson<T>({
  messages,
  schema,
  temperature = 0.2,
  fallback,
}: GenerateJsonParams<T>): Promise<T> {
  if (!openai) return fallback;

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = safeParseJson(raw, schema);
  if (parsed) return parsed;

  const repair = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Fix the JSON output so it matches the required schema. Return ONLY valid JSON.",
      },
      ...messages,
      { role: "assistant", content: raw },
    ],
  });

  const repairedRaw = repair.choices[0]?.message?.content ?? "";
  return safeParseJson(repairedRaw, schema) ?? fallback;
}

function safeParseJson<T>(content: string, schema: z.ZodSchema<T>) {
  try {
    const cleaned = stripJson(content);
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}
