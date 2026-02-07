import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { prisma } from "@/lib/db";

export default async function ManagerPage() {
  const cycles = await prisma.reviewCycle.findMany({
    include: {
      employee: true,
      nominations: true,
      combined: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Manager</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Review cycles
        </h1>
        <p className="mt-2 text-sm text-muted">
          Track incoming reviews and finalise the combined summary.
        </p>
      </div>

      <Card>
        <div className="space-y-3 text-sm">
          {cycles.length === 0 ? (
            <p className="text-muted">No review cycles yet.</p>
          ) : (
            cycles.map((cycle) => {
              const submittedCount = cycle.nominations.filter(
                (nomination) => nomination.status === "SUBMITTED",
              ).length;
              const status =
                cycle.combined?.status === "FINALISED"
                  ? "Finalised"
                  : submittedCount >= 2
                    ? "Ready"
                    : "Requested";

              return (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {cycle.employee.name}
                    </div>
                    <div className="text-xs text-muted">
                      {submittedCount} / {cycle.nominations.length} reviews submitted
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/manager/cycles/${cycle.id}`}
                      className="text-xs text-link underline"
                    >
                      Open summary
                    </Link>
                    <StatusPill
                      label={status}
                      tone={status === "Ready" ? "info" : "neutral"}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
