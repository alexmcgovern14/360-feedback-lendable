import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { Collapsible } from "@/components/Collapsible";
import { StatusPill } from "@/components/StatusPill";
import { combineReviews } from "@/lib/combined/combineReviews";
import { getCycleById } from "@/lib/json-data";
import { getLatestCombinedArtifacts, isCombinedReviewGenerationNeeded } from "@/lib/runtime/combined-artifacts";
import { getLatestManagerCombinedState } from "@/lib/runtime/manager-edit-artifacts";
import { loadReviewState } from "@/lib/runtime/review-artifacts";
import { getLatestStructuredReviewArtifact } from "@/lib/runtime/structured-artifacts";
import { prisma } from "@/lib/db";
import { ReviewStructuredSchema } from "@/lib/schemas/reviewStructured";
import type { CombinedData } from "./CombinedReviewEditor";
import { CombinedReviewEditor } from "./CombinedReviewEditor";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerCyclePage({ params }: PageProps) {
  const { id } = await params;

  if (process.env.USE_JSON_DATA === "true") {
    const cycle = getCycleById(id);
    if (!cycle) notFound();
    let combined: Awaited<ReturnType<typeof getLatestCombinedArtifacts>> = null;
    let manager: Awaited<ReturnType<typeof getLatestManagerCombinedState>> = null;
    let isGenerating = false;
    let generationError: string | null = null;
    try {
      [combined, manager, isGenerating] = await Promise.all([
        getLatestCombinedArtifacts(id),
        getLatestManagerCombinedState(id),
        isCombinedReviewGenerationNeeded(id),
      ]);
    } catch (error) {
      generationError =
        error instanceof Error
          ? error.message
          : "Failed to read combined review artifacts.";
    }
    const combinedData = (manager?.editedJson ??
      combined?.step3Json ??
      null) as CombinedData | null;
    const submittedCount = cycle.nominations.filter(
      (nomination) => nomination.status === "SUBMITTED",
    ).length;

    const runtimeNominations = await Promise.all(
      cycle.nominations.map(async (nomination) => {
        const [state, structuredArtifact] = await Promise.all([
          loadReviewState(nomination.requestToken),
          getLatestStructuredReviewArtifact({
            cycleId: id,
            token: nomination.requestToken,
          }),
        ]);

        return {
          ...nomination,
          chatMessages: state?.messages?.map((m) => ({
            id: `${nomination.id}-${m.at}`,
            nominationId: nomination.id,
            role: m.role.toUpperCase(),
            content: m.content,
            createdAt: m.at,
          })) ?? nomination.chatMessages,
          structured: structuredArtifact
            ? {
                id: `blob-${nomination.id}`,
                nominationId: nomination.id,
                model: structuredArtifact.model,
                json: structuredArtifact.json,
                createdAt: structuredArtifact.createdAt,
              }
            : nomination.structured,
        };
      }),
    );

    return (
      <div className="space-y-6">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Manager review</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            {cycle.employee.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {submittedCount} / {cycle.nominations.length} reviews submitted
          </p>
        </Card>

        {generationError ? (
          <Card>
            <h2 className="text-lg font-semibold text-foreground">
              Combined review unavailable
            </h2>
            <p className="mt-2 text-sm text-muted">{generationError}</p>
            <p className="mt-2 text-xs text-muted">
              Check Blob storage configuration and refresh this page.
            </p>
          </Card>
        ) : isGenerating ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
              <h2 className="text-lg font-semibold text-foreground">Generating summary</h2>
              <p className="mt-2 text-sm text-muted">
                Combining reviews and generating insights. This may take a moment...
              </p>
              <p className="mt-2 text-xs text-muted">
                If this takes more than 20 seconds, refresh to check progress.
              </p>
            </div>
          </Card>
        ) : combinedData ? (
          <CombinedReviewEditor
            cycleId={id}
            status={(manager?.status ?? "DRAFT") as "DRAFT" | "FINALISED"}
            initialData={combinedData}
          />
        ) : (
          <Card>
            <h2 className="text-lg font-semibold text-foreground">Combined review</h2>
            <p className="mt-2 text-sm text-muted">
              Combined insights will appear once at least two reviews are submitted.
            </p>
          </Card>
        )}

        {combined?.step1OmittedJson ? (
          <Collapsible title="Omitted insights">
            <div className="space-y-3">
              {(["start_doing", "stop_doing", "continue_doing"] as const).map(
                (section) => (
                  <div key={section}>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {section.replace("_", " ")}
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-foreground">
                      {(combined?.step1OmittedJson as Record<string, unknown[]>)?.[section]?.length > 0 ? (
                        ((combined?.step1OmittedJson as Record<string, { insight: string; evidence: string }[]>)[section]).map(
                          (item, index) => (
                            <div
                              key={`${section}-${index}`}
                              className="rounded border border-border bg-background px-3 py-2"
                            >
                              <p className="font-semibold">{item.insight}</p>
                              <p className="text-xs text-muted">{item.evidence}</p>
                            </div>
                          ),
                        )
                      ) : (
                        <p className="text-xs text-muted">No omitted insights.</p>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </Collapsible>
        ) : null}

        <Collapsible title="JSON artifacts (observability)">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Latest combined artifacts
              </p>
              <pre className="mt-2 max-h-[420px] overflow-auto rounded border border-border bg-background p-3 text-xs">
                {JSON.stringify(combined, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Manager edits (latest)
              </p>
              <pre className="mt-2 max-h-[420px] overflow-auto rounded border border-border bg-background p-3 text-xs">
                {JSON.stringify(manager, null, 2)}
              </pre>
            </div>
          </div>
        </Collapsible>

        <Card>
          <h2 className="text-lg font-semibold text-foreground">Individual reviews</h2>
          <div className="mt-4 space-y-4">
            {runtimeNominations.map((nomination) => {
              const parsed = nomination.structured
                ? ReviewStructuredSchema.safeParse(nomination.structured.json)
                : null;
              const structured = parsed?.success ? parsed.data : null;

              return (
                <div
                  key={nomination.id}
                  className="rounded border border-border bg-background p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {nomination.reviewer.name}
                      </p>
                      <p className="text-xs text-muted">
                        {nomination.relationshipType.replace("_", " ")} ·{" "}
                        {nomination.collaborationFrequency.toLowerCase()}
                      </p>
                    </div>
                    <StatusPill
                      label={nomination.status === "SUBMITTED" ? "Submitted" : "Requested"}
                      tone={nomination.status === "SUBMITTED" ? "success" : "info"}
                    />
                  </div>

                  {structured ? (
                    <div className="mt-3 space-y-3">
                      {(["start_doing", "stop_doing", "continue_doing"] as const).map(
                        (section) => (
                          <div key={section}>
                            <p className="text-xs uppercase tracking-wide text-muted">
                              {section.replace("_", " ")}
                            </p>
                            <div className="mt-2 space-y-2">
                              {structured[section].length === 0 ? (
                                <p className="text-xs text-muted">
                                  No insights provided.
                                </p>
                              ) : (
                                structured[section].map((item, index) => (
                                  <div
                                    key={`${section}-${index}`}
                                    className="rounded border border-border bg-surface px-3 py-2"
                                  >
                                    <p className="font-semibold">{item.insight}</p>
                                    <p className="text-xs text-muted">
                                      {item.description}
                                    </p>
                                    <p className="text-xs text-muted">
                                      Evidence: {item.evidence}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Structured summary not available yet.
                    </p>
                  )}

                  {nomination.chatMessages.length > 0 ? (
                    <div className="mt-3">
                      <Collapsible title="View transcript">
                        <div className="space-y-2 text-xs text-foreground">
                          {nomination.chatMessages.map((message) => (
                            <div key={message.id}>
                              <span className="font-semibold">
                                {message.role.toLowerCase()}:
                              </span>{" "}
                              {message.content}
                            </div>
                          ))}
                        </div>
                      </Collapsible>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const cycle = await prisma.reviewCycle.findUnique({
    where: { id },
    include: {
      employee: true,
      nominations: {
        include: {
          reviewer: true,
          structured: true,
          chatMessages: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      combined: true,
    },
  });

  if (!cycle) {
    notFound();
  }

  const submittedCount = cycle.nominations.filter(
    (nomination) => nomination.status === "SUBMITTED",
  ).length;

  // Check if we have structured reviews but no combined review (generation needed/in progress)
  const hasStructuredReviews = cycle.nominations.some(
    (nomination) => nomination.status === "SUBMITTED" && nomination.structured !== null,
  );
  const structuredCount = cycle.nominations.filter(
    (nomination) => nomination.status === "SUBMITTED" && nomination.structured !== null,
  ).length;
  const isGenerating = submittedCount >= 2 && structuredCount >= 2 && !cycle.combined;

  // Try to generate if needed (but don't block on it - show loading if it's taking time)
  let combined = cycle.combined;
  if (!combined && submittedCount >= 2 && structuredCount >= 2) {
    try {
      combined = await combineReviews(id);
    } catch (error) {
      console.error("Failed to generate combined review:", error);
      // Continue to show loading state if generation fails
    }
  }

  const combinedData =
    combined?.editedJson ?? combined?.step3Json ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Manager review</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {cycle.employee.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {submittedCount} / {cycle.nominations.length} reviews submitted
        </p>
      </Card>

      {isGenerating && !combinedData ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
            <h2 className="text-lg font-semibold text-foreground">Generating summary</h2>
            <p className="mt-2 text-sm text-muted">
              Combining reviews and generating insights. This may take a moment...
            </p>
            <p className="mt-2 text-xs text-muted">
              If this takes more than 20 seconds, refresh to check progress.
            </p>
          </div>
        </Card>
      ) : combinedData ? (
        <CombinedReviewEditor
          cycleId={id}
          status={combined?.status ?? "DRAFT"}
          initialData={combinedData as CombinedData}
        />
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-foreground">Combined review</h2>
          <p className="mt-2 text-sm text-muted">
            Combined insights will appear once at least two reviews are submitted.
          </p>
        </Card>
      )}

      {combined?.step1OmittedJson ? (
        <Collapsible title="Omitted insights">
          <div className="space-y-3">
            {/*
              Omitted payload comes from model output; parse as optional per-section arrays.
            */}
            {(() => {
              const omitted = combined?.step1OmittedJson as Partial<
                Record<
                  "start_doing" | "stop_doing" | "continue_doing",
                  Array<{ insight: string; evidence: string }>
                >
              >;
              return (["start_doing", "stop_doing", "continue_doing"] as const).map(
                (section) => (
                  <div key={section}>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {section.replace("_", " ")}
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-foreground">
                      {omitted[section]?.length ? (
                        omitted[section]!.map((item, index) => (
                          <div
                            key={`${section}-${index}`}
                            className="rounded border border-border bg-background px-3 py-2"
                          >
                            <p className="font-semibold">{item.insight}</p>
                            <p className="text-xs text-muted">{item.evidence}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">No omitted insights.</p>
                      )}
                    </div>
                  </div>
                ),
              );
            })()}
          </div>
        </Collapsible>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-foreground">Individual reviews</h2>
        <div className="mt-4 space-y-4">
          {cycle.nominations.map((nomination) => {
            const parsed = nomination.structured
              ? ReviewStructuredSchema.safeParse(nomination.structured.json)
              : null;
            const structured = parsed?.success ? parsed.data : null;

            return (
              <div
                key={nomination.id}
                className="rounded border border-border bg-background p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {nomination.reviewer.name}
                    </p>
                    <p className="text-xs text-muted">
                      {nomination.relationshipType.replace("_", " ")} ·{" "}
                      {nomination.collaborationFrequency.toLowerCase()}
                    </p>
                  </div>
                  <StatusPill
                    label={nomination.status === "SUBMITTED" ? "Submitted" : "Requested"}
                    tone={nomination.status === "SUBMITTED" ? "success" : "info"}
                  />
                </div>

                {structured ? (
                  <div className="mt-3 space-y-3">
                    {(["start_doing", "stop_doing", "continue_doing"] as const).map(
                      (section) => (
                        <div key={section}>
                          <p className="text-xs uppercase tracking-wide text-muted">
                            {section.replace("_", " ")}
                          </p>
                          <div className="mt-2 space-y-2">
                            {structured[section].length === 0 ? (
                              <p className="text-xs text-muted">
                                No insights provided.
                              </p>
                            ) : (
                              structured[section].map((item, index) => (
                                <div
                                  key={`${section}-${index}`}
                                  className="rounded border border-border bg-surface px-3 py-2"
                                >
                                  <p className="font-semibold">{item.insight}</p>
                                  <p className="text-xs text-muted">
                                    {item.description}
                                  </p>
                                  <p className="text-xs text-muted">
                                    Evidence: {item.evidence}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    Structured summary not available yet.
                  </p>
                )}

                {nomination.chatMessages.length > 0 ? (
                  <div className="mt-3">
                    <Collapsible title="View transcript">
                      <div className="space-y-2 text-xs text-foreground">
                        {nomination.chatMessages.map((message) => (
                          <div key={message.id}>
                            <span className="font-semibold">
                              {message.role.toLowerCase()}:
                            </span>{" "}
                            {message.content}
                          </div>
                        ))}
                      </div>
                    </Collapsible>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
