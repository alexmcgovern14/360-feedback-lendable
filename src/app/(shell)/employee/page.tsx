import Link from "next/link";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { getFirstCycleWithRuntime } from "@/lib/runtime/employee-nominations";
import { getPeople } from "@/lib/json-data";
import { prisma } from "@/lib/db";
import { EmployeeNominationForm } from "./EmployeeNominationForm";

export const dynamic = "force-dynamic";

export default async function EmployeePage() {
  if (process.env.USE_JSON_DATA === "true") {
    const cycle = await getFirstCycleWithRuntime();
    if (!cycle) {
      return (
        <Card>
          <h1 className="text-xl font-semibold">No review cycle found</h1>
          <p className="mt-2 text-sm text-muted">
            Demo data not loaded.
          </p>
        </Card>
      );
    }
    const people = getPeople();
    const existingReviewerIds = cycle.nominations.map((nomination) => nomination.reviewerId);
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Employee</p>
          <h1 className="text-2xl font-semibold text-foreground">
            Nominate reviewers for {cycle.employee.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Choose 3–6 colleagues who you have worked closely with, across a variety
            of departments, projects or relationship types.
          </p>
        </div>

        <Card>
          <EmployeeNominationForm
            people={people}
            existingReviewerIds={existingReviewerIds}
          />
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Requested reviewers
              </h2>
              <p className="text-sm text-muted">
                Share each link with the reviewer. Email delivery is mocked.
              </p>
            </div>
            <button
              className="rounded border border-border px-3 py-1 text-xs text-muted"
              disabled={cycle.nominations.length < 3}
            >
              Done (min 3)
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {cycle.nominations.length === 0 ? (
              <p className="text-muted">No reviewers added yet.</p>
            ) : (
              cycle.nominations.map((nomination) => {
                const isSubmitted = nomination.status === "SUBMITTED";
                return (
                  <div
                    key={nomination.id}
                    className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {nomination.reviewer.name}
                      </div>
                      <div className="text-xs text-muted">
                        {nomination.relationshipType.replace("_", " ")} ·{" "}
                        {nomination.collaborationFrequency.toLowerCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/reviewer/requests/${nomination.requestToken}`}
                        className="text-xs text-link underline"
                      >
                        Review link
                      </Link>
                      <StatusPill
                        label={isSubmitted ? "Completed" : "Requested"}
                        tone={isSubmitted ? "success" : "info"}
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

  let cycle: Awaited<
    ReturnType<typeof prisma.reviewCycle.findFirst<{
      include: {
        employee: true;
        nominations: { include: { reviewer: true }; orderBy: { createdAt: "asc" } };
      };
    }>>
  > = null;
  let people: Awaited<ReturnType<typeof prisma.person.findMany>> = [];
  let dbError: string | null = null;

  try {
    cycle = await prisma.reviewCycle.findFirst({
      include: {
        employee: true,
        nominations: {
          where: { isSeed: false },
          include: { reviewer: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (cycle) {
      people = await prisma.person.findMany({ orderBy: { name: "asc" } });
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database connection failed.";
  }

  if (dbError) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">Database unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          {dbError}
        </p>
        <p className="mt-2 text-xs text-muted">
          Use the <strong>Transaction mode</strong> URI from Supabase Dashboard → Project Settings → Database → Connect (port 6543). Set it as DATABASE_URL on Vercel (no quotes). Add <code className="rounded bg-muted px-1">?pgbouncer=true</code> for Prisma. If you still see &quot;Can&apos;t reach&quot;, check Database → Network restrictions and allow connections (or allowlist IPs).
        </p>
      </Card>
    );
  }

  if (!cycle) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">No review cycle found</h1>
        <p className="mt-2 text-sm text-muted">
          Run the seed script to create a sample review cycle.
        </p>
      </Card>
    );
  }

  const existingReviewerIds = cycle.nominations.map((nomination) => nomination.reviewerId);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Employee</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Nominate reviewers for {cycle.employee.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Choose 3–6 colleagues who you have worked closely with, across a variety
          of departments, projects or relationship types.
        </p>
      </div>

      <Card>
        <EmployeeNominationForm
          people={people}
          existingReviewerIds={existingReviewerIds}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Requested reviewers
            </h2>
            <p className="text-sm text-muted">
              Share each link with the reviewer. Email delivery is mocked.
            </p>
          </div>
          <button
            className="rounded border border-border px-3 py-1 text-xs text-muted"
            disabled={cycle.nominations.length < 3}
          >
            Done (min 3)
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          {cycle.nominations.length === 0 ? (
            <p className="text-muted">No reviewers added yet.</p>
          ) : (
            cycle.nominations.map((nomination) => {
              const isSubmitted = nomination.status === "SUBMITTED";
              return (
                <div
                  key={nomination.id}
                  className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {nomination.reviewer.name}
                    </div>
                    <div className="text-xs text-muted">
                      {nomination.relationshipType.replace("_", " ")} ·{" "}
                      {nomination.collaborationFrequency.toLowerCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/reviewer/requests/${nomination.requestToken}`}
                      className="text-xs text-link underline"
                    >
                      Review link
                    </Link>
                    <StatusPill
                      label={isSubmitted ? "Completed" : "Requested"}
                      tone={isSubmitted ? "success" : "info"}
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
