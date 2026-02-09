import { head, list, put } from "@vercel/blob";

const DEFAULT_CACHE_SECONDS = 60; // keep observability reasonably fresh

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN ?? null;
}

function requireBlobToken() {
  const token = getBlobToken();
  if (!token) {
    throw new Error(
      "Blob storage is not configured. Missing BLOB_READ_WRITE_TOKEN.",
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
  required?: boolean;
}) {
  const token = options?.required ? requireBlobToken() : getBlobToken();
  if (!token) return { pathname, url: "", contentType: "application/json" };

  return put(pathname, JSON.stringify(json, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: options?.cacheControlMaxAge ?? DEFAULT_CACHE_SECONDS,
    allowOverwrite: options?.allowOverwrite ?? false,
    token,
  });
}

export async function getJson<T = unknown>(
  urlOrPathname: string,
  options?: { required?: boolean },
): Promise<T | null> {
  const token = options?.required ? requireBlobToken() : getBlobToken();
  if (!token) return null;
  try {
    const meta = await head(urlOrPathname, { token });
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listAll(prefix: string, options?: { required?: boolean }) {
  const token = options?.required ? requireBlobToken() : getBlobToken();
  if (!token) return [];

  const blobs: Array<{ pathname: string; url: string; uploadedAt?: string }> = [];
  let cursor: string | undefined = undefined;

  for (;;) {
    const page: Awaited<ReturnType<typeof list>> = await list({
      prefix,
      limit: 1000,
      cursor,
      token,
    });

    for (const b of page.blobs) {
      const uploadedAt =
        b.uploadedAt instanceof Date
          ? b.uploadedAt.toISOString()
          : typeof b.uploadedAt === "string"
            ? b.uploadedAt
            : undefined;
      blobs.push({
        pathname: b.pathname,
        url: b.url,
        uploadedAt,
      });
    }

    if (!page.hasMore) break;
    cursor = page.cursor;
  }

  return blobs;
}

export function assertBlobConfigured() {
  requireBlobToken();
}

