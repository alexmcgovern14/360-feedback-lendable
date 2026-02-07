"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">
          {error.message || "A server-side error occurred."}
        </p>
        <p className="mt-2 text-xs text-muted">
          If you just deployed, set DATABASE_URL in Vercel to the Transaction
          mode URI from Supabase (Dashboard → Database → Connect, port 6543),
          add ?pgbouncer=true, and check Database → Network restrictions.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/employee"
            className="inline-flex items-center justify-center rounded border border-link px-4 py-2 text-sm font-semibold text-link transition hover:bg-background"
          >
            Go to Employee
          </Link>
        </div>
      </Card>
    </div>
  );
}
