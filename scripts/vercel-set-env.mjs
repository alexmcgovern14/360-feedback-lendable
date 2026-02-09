/**
 * Push env vars from .env to Vercel project via Vercel REST API.
 * Requires: VERCEL_TOKEN in .env (create at https://vercel.com/account/tokens)
 * Pushes: USE_JSON_DATA, USE_QA_SEED, DATABASE_URL, OPENAI_API_KEY, OPENAI_MODEL, BLOB_READ_WRITE_TOKEN.
 *
 * Blob: Creating a Blob store cannot be done via the API. One-time step:
 * 1. In Vercel dashboard → your project → Storage → Connect → Create New → Blob → create and connect.
 * 2. Vercel then injects BLOB_READ_WRITE_TOKEN for that project automatically, or run
 *    `vercel env pull` locally and re-run this script to push the token from .env.
 *
 * Run: node scripts/vercel-set-env.mjs [projectId]
 *      npm run vercel:env
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
    key: "USE_JSON_DATA",
    value: process.env.USE_JSON_DATA ?? "true",
    type: "plain",
    comment: "Use static JSON (data/seed.json) instead of database; set to true for demo",
  },
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
  {
    key: "USE_QA_SEED",
    value: process.env.USE_QA_SEED,
    type: "plain",
    comment: "If 'true', load data/seed.qa.json (no nominations/chat/structured) for a clean QA slate",
  },
  {
    key: "BLOB_READ_WRITE_TOKEN",
    value: process.env.BLOB_READ_WRITE_TOKEN,
    type: "plain",
    comment: "Vercel Blob read-write token for JSON artifact persistence",
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
  let skippedBlob = false;
  for (const v of VARS) {
    if (v.key === "BLOB_READ_WRITE_TOKEN" && !v.value) skippedBlob = true;
    await setEnv(v);
  }
  if (skippedBlob) {
    console.log("");
    console.log("BLOB_READ_WRITE_TOKEN was not set in .env. To enable Blob:");
    console.log("  1. Vercel dashboard → this project → Storage → Connect → Blob → Create and connect.");
    console.log("  2. Then either rely on auto-injected token, or run: vercel env pull && npm run vercel:env");
  }
  console.log("Done. Redeploy the project for changes to take effect.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
