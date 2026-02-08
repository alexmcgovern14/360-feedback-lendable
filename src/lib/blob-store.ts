import { head, list, put } from "@vercel/blob";

const DEFAULT_CACHE_SECONDS = 60; // keep observability reasonably fresh

function requireBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Missing BLOB_READ_WRITE_TOKEN. Create a Vercel Blob store and add its read-write token to your env (or run `vercel env pull`).",
    );
  }
  return token;
}

export function makeArtifactTimestamp(date = new Date()) {
  // Path-safe, sortable.
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function putJson(pathname: string, json: unknown, options?: {
  cacheControlMaxAge?: number;
  allowOverwrite?: boolean;
}) {
  // Ensure local dev fails loudly instead of silently “not persisting”.
  requireBlobToken();

  return put(pathname, JSON.stringify(json, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: options?.cacheControlMaxAge ?? DEFAULT_CACHE_SECONDS,
    allowOverwrite: options?.allowOverwrite ?? false,
  });
}

export async function getJson<T = unknown>(urlOrPathname: string): Promise<T | null> {
  try {
    requireBlobToken();
    const meta = await head(urlOrPathname);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listAll(prefix: string) {
  requireBlobToken();

  const blobs: Array<{ pathname: string; url: string; uploadedAt?: string }> = [];
  let cursor: string | undefined = undefined;

  for (;;) {
    const page: Awaited<ReturnType<typeof list>> = await list({
      prefix,
      limit: 1000,
      cursor,
    });

    for (const b of page.blobs) {
      blobs.push({
        pathname: b.pathname,
        url: b.url,
        uploadedAt: (b as any).uploadedAt,
      });
    }

    if (!page.hasMore) break;
    cursor = page.cursor;
  }

  return blobs;
}

