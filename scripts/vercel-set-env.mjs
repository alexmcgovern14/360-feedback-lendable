/**
 * Push env vars from .env to Vercel project.
 * Requires: VERCEL_TOKEN in .env (create at https://vercel.com/account/tokens)
 * Reads: DATABASE_URL, OPENAI_API_KEY, OPENAI_MODEL from .env and sets them on the project.
 *
 * Run: node scripts/vercel-set-env.mjs [projectId]
 * Default projectId: prj_TdxVOPpICSPYxB4knkVghx5YWLrS
 */
import dotenv from "dotenv";
import { resolve } from "path";

const cwd = process.cwd();
// Load .env then .env.local; also parent .env.local (e.g. repo root)
dotenv.config({ path: resolve(cwd, ".env") });
dotenv.config({ path: resolve(cwd, ".env.local"), override: true });
dotenv.config({ path: resolve(cwd, "..", ".env.local"), override: true });

const PROJECT_ID = process.argv[2] || "prj_TdxVOPpICSPYxB4knkVghx5YWLrS";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!VERCEL_TOKEN) {
  console.error("Missing VERCEL_TOKEN. Add it to .env or set it when running.");
  console.error("Create a token at https://vercel.com/account/tokens");
  process.exit(1);
}

const VARS = [
  {
    key: "DATABASE_URL",
    value: process.env.DATABASE_URL,
    type: "plain",
    comment: "Supabase Postgres connection string (no quotes)",
  },
  {
    key: "OPENAI_API_KEY",
    value: process.env.OPENAI_API_KEY,
    type: "plain",
    comment: "OpenAI API key for LLM",
  },
  {
    key: "OPENAI_MODEL",
    value: process.env.OPENAI_MODEL || "gpt-4o-mini",
    type: "plain",
    comment: "OpenAI model name",
  },
];

const TARGET = ["production", "preview", "development"];
const BASE = "https://api.vercel.com";

async function setEnv({ key, value, type, comment }) {
  if (!value) {
    console.log(`Skip ${key} (not set in .env)`);
    return;
  }
  const res = await fetch(
    `${BASE}/v10/projects/${encodeURIComponent(PROJECT_ID)}/env?upsert=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type,
        target: TARGET,
        comment: comment || null,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel API ${res.status}: ${err}`);
  }
  const data = await res.json();
  if (data.failed && data.failed.length) {
    throw new Error(JSON.stringify(data.failed));
  }
  console.log(`Set ${key} (${type}) for ${TARGET.join(", ")}`);
}

async function main() {
  console.log(`Project: ${PROJECT_ID}`);
  for (const v of VARS) {
    await setEnv(v);
  }
  console.log("Done. Redeploy the project for changes to take effect.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
