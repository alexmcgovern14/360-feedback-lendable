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
          If you just deployed, check that DATABASE_URL is set in Vercel (no
          quotes) and use Supabase&apos;s connection pooler (port 6543) for
          production.
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
