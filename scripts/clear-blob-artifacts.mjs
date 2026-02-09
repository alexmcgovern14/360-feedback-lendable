/**
 * Delete all runtime artifacts from Vercel Blob so you can run a fresh QA pass.
 * Requires: BLOB_READ_WRITE_TOKEN in .env or .env.local
 *
 * Run from repo root: node lendable-app/scripts/clear-blob-artifacts.mjs
 * Or from lendable-app: node scripts/clear-blob-artifacts.mjs
 */
import dotenv from "dotenv";
import { resolve } from "path";
import { list, del } from "@vercel/blob";

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, ".env") });
dotenv.config({ path: resolve(cwd, ".env.local"), override: true });
dotenv.config({ path: resolve(cwd, "..", ".env.local"), override: true });

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Set it in .env or .env.local");
  process.exit(1);
}

const PREFIX = "artifacts/";

async function main() {
  const pathnames = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, limit: 1000, cursor, token });
    for (const b of page.blobs) pathnames.push(b.pathname);
    cursor = page.cursor;
  } while (cursor);

  if (pathnames.length === 0) {
    console.log("No blobs under artifacts/ — already clear.");
    return;
  }

  console.log(`Deleting ${pathnames.length} blob(s) under ${PREFIX}...`);
  await del(pathnames, { token });
  console.log("Done. Runtime data (nominations, review state, structured/combined artifacts) is cleared.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
