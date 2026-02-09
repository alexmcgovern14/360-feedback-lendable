import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { getNominations } from "@/lib/json-data";
import { prisma } from "@/lib/db";

export default async function ReviewerInboxPage() {
  if (process.env.USE_JSON_DATA === "true") {
    const nominations = getNominations();
    const requested = nominations.filter((nomination) => nomination.status === "REQUESTED");
    const submitted = nominations.filter((nomination) => nomination.status === "SUBMITTED");

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Reviewer</p>
          <h1 className="text-2xl font-semibold text-foreground">Reviewer inbox</h1>
          <p className="mt-2 text-sm text-muted">
            Complete outstanding reviews and track what you have already submitted.
          </p>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-foreground">Outstanding</h2>
          <div className="mt-4 space-y-3 text-sm">
            {requested.length === 0 ? (
              <p className="text-muted">No pending reviews.</p>
            ) : (
              requested.map((nomination) => (
                <Link
                  key={nomination.id}
                  href={`/reviewer/requests/${nomination.requestToken}`}
                  className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 transition-colors hover:bg-background/80"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {nomination.cycle.employee.name}
                    </div>
                    <div className="text-xs text-muted">
                      Reviewer: {nomination.reviewer.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-link underline">Open review</span>
                    <StatusPill label="To do" tone="info" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-foreground">Submitted</h2>
          <div className="mt-4 space-y-3 text-sm">
            {submitted.length === 0 ? (
              <p className="text-muted">No completed reviews yet.</p>
            ) : (
              submitted.map((nomination) => (
                <div
                  key={nomination.id}
                  className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {nomination.cycle.employee.name}
                    </div>
                    <div className="text-xs text-muted">
                      Reviewer: {nomination.reviewer.name}
                    </div>
                  </div>
                  <StatusPill label="Submitted" tone="success" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  }

  let nominations: Awaited<
    ReturnType<
      typeof prisma.nomination.findMany<{
        include: {
          reviewer: true;
          cycle: { include: { employee: true } };
        };
      }>
    >
  > = [];
  let dbError: string | null = null;

  try {
    nominations = await prisma.nomination.findMany({
      include: {
        reviewer: true,
        cycle: { include: { employee: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database connection failed.";
  }

  if (dbError) {
    return (
      <div className="space-y-6">
        <Card>
          <h1 className="text-xl font-semibold">Database unavailable</h1>
          <p className="mt-2 text-sm text-muted">{dbError}</p>
          <p className="mt-2 text-xs text-muted">
            Use the Transaction mode URI from Supabase Dashboard → Database →
            Connect (port 6543) as DATABASE_URL on Vercel. Add
            ?pgbouncer=true for Prisma. Check Network restrictions if
            unreachable.
          </p>
        </Card>
      </div>
    );
  }

  const requested = nominations.filter((nomination) => nomination.status === "REQUESTED");
  const submitted = nominations.filter((nomination) => nomination.status === "SUBMITTED");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Reviewer</p>
        <h1 className="text-2xl font-semibold text-foreground">Reviewer inbox</h1>
        <p className="mt-2 text-sm text-muted">
          Complete outstanding reviews and track what you have already submitted.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-foreground">Outstanding</h2>
        <div className="mt-4 space-y-3 text-sm">
          {requested.length === 0 ? (
            <p className="text-muted">No pending reviews.</p>
          ) : (
            requested.map((nomination) => (
              <Link
                key={nomination.id}
                href={`/reviewer/requests/${nomination.requestToken}`}
                className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 transition-colors hover:bg-background/80"
              >
                <div>
                  <div className="font-semibold text-foreground">
                    {nomination.cycle.employee.name}
                  </div>
                  <div className="text-xs text-muted">
                    Reviewer: {nomination.reviewer.name}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-link underline">Open review</span>
                  <StatusPill label="To do" tone="info" />
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-foreground">Submitted</h2>
        <div className="mt-4 space-y-3 text-sm">
          {submitted.length === 0 ? (
            <p className="text-muted">No completed reviews yet.</p>
          ) : (
            submitted.map((nomination) => (
              <div
                key={nomination.id}
                className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
              >
                <div>
                  <div className="font-semibold text-foreground">
                    {nomination.cycle.employee.name}
                  </div>
                  <div className="text-xs text-muted">
                    Reviewer: {nomination.reviewer.name}
                  </div>
                </div>
                <StatusPill label="Submitted" tone="success" />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
