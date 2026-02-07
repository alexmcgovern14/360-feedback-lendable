import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { prisma } from "@/lib/db";

export default async function ReviewerInboxPage() {
  const nominations = await prisma.nomination.findMany({
    include: {
      reviewer: true,
      cycle: { include: { employee: true } },
    },
    orderBy: { createdAt: "asc" },
  });

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
                <div className="flex items-center gap-3">
                  <Link
                    href={`/reviewer/requests/${nomination.requestToken}`}
                    className="text-xs text-link underline"
                  >
                    Open review
                  </Link>
                  <StatusPill label="To do" tone="info" />
                </div>
              </div>
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
