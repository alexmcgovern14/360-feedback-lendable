import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SidebarSection } from "./sidebar";

type Seed = {
  people: Array<{ id: string; name: string }>;
  cycles: Array<{
    id: string;
    employeeId: string;
    managerId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  nominations: Array<{
    id: string;
    cycleId: string;
    reviewerId: string;
    relationshipType: string;
    collaborationFrequency: string;
    requestToken: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  chatMessages: Array<{
    id: string;
    nominationId: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  reviewStructured: Array<{
    id: string;
    nominationId: string;
    model: string | null;
    json: unknown;
    createdAt: string;
  }>;
  combinedReview: {
    id: string;
    cycleId: string;
    step1PrimaryJson: unknown;
    step1OmittedJson: unknown;
    step2Json: unknown;
    step3Json: unknown;
    editedJson: unknown;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
};

let cached: Seed | null = null;

function loadSeed(): Seed {
  if (cached) return cached;
  const filename = process.env.USE_QA_SEED === "true" ? "seed.qa.json" : "seed.json";
  const path = join(process.cwd(), "data", filename);
  const raw = readFileSync(path, "utf-8");
  cached = JSON.parse(raw) as Seed;
  return cached;
}

export function personById(id: string) {
  const p = loadSeed().people.find((x) => x.id === id);
  if (!p) throw new Error(`Person ${id} not found`);
  return p;
}

export function getPeople() {
  const seed = loadSeed();
  return [...seed.people].sort((a, b) => a.name.localeCompare(b.name));
}

export function getFirstCycle() {
  const seed = loadSeed();
  const cycle = seed.cycles[0];
  if (!cycle) return null;
  const employee = personById(cycle.employeeId);
  const nominations = seed.nominations
    .filter((n) => n.cycleId === cycle.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((n) => ({
      ...n,
      reviewer: personById(n.reviewerId),
    }));
  const combined = seed.combinedReview.cycleId === cycle.id ? seed.combinedReview : null;
  return {
    ...cycle,
    employee,
    nominations,
    combined,
  };
}

export function getCycleById(id: string) {
  const seed = loadSeed();
  const cycle = seed.cycles.find((c) => c.id === id);
  if (!cycle) return null;
  const employee = personById(cycle.employeeId);
  const nominations = seed.nominations
    .filter((n) => n.cycleId === cycle.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((n) => {
      const reviewer = personById(n.reviewerId);
      const chatMessages = seed.chatMessages
        .filter((m) => m.nominationId === n.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      const structured = seed.reviewStructured.find(
        (r) => r.nominationId === n.id,
      );
      return {
        ...n,
        reviewer,
        chatMessages,
        structured: structured
          ? { id: structured.id, nominationId: structured.nominationId, model: structured.model, json: structured.json, createdAt: structured.createdAt }
          : null,
      };
    });
  const combined = seed.combinedReview.cycleId === cycle.id ? seed.combinedReview : null;
  return {
    ...cycle,
    employee,
    nominations,
    combined,
  };
}

export function getNominations() {
  const seed = loadSeed();
  return seed.nominations
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((n) => {
      const reviewer = personById(n.reviewerId);
      const cycle = seed.cycles.find((c) => c.id === n.cycleId)!;
      const employee = personById(cycle.employeeId);
      return {
        ...n,
        reviewer,
        cycle: { ...cycle, employee },
      };
    });
}

export function getNominationByToken(token: string) {
  const seed = loadSeed();
  const n = seed.nominations.find((x) => x.requestToken === token);
  if (!n) return null;
  const reviewer = personById(n.reviewerId);
  const cycle = seed.cycles.find((c) => c.id === n.cycleId)!;
  const employee = personById(cycle.employeeId);
  const chatMessages = seed.chatMessages
    .filter((m) => m.nominationId === n.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  return {
    ...n,
    reviewer,
    cycle: { ...cycle, employee },
    chatMessages,
  };
}

export function getCombinedReview(cycleId: string) {
  const seed = loadSeed();
  if (seed.combinedReview.cycleId !== cycleId) return null;
  return seed.combinedReview;
}

export function getStructuredReviewsForCycle(cycleId: string) {
  const seed = loadSeed();
  const nominationIds = new Set(
    seed.nominations.filter((n) => n.cycleId === cycleId && n.status === "SUBMITTED").map((n) => n.id),
  );
  return seed.reviewStructured
    .filter((r) => nominationIds.has(r.nominationId))
    .map((r) => {
      const nomination = seed.nominations.find((n) => n.id === r.nominationId)!;
      return { ...r, nomination: { ...nomination, reviewer: personById(nomination.reviewerId) } };
    });
}

export function getSidebarSections(): SidebarSection[] {
  const seed = loadSeed();
  const requested = seed.nominations
    .filter((n) => n.status === "REQUESTED")
    .map((n) => {
      const cycle = seed.cycles.find((c) => c.id === n.cycleId)!;
      const employee = personById(cycle.employeeId);
      return { ...n, cycle: { ...cycle, employee } };
    });
  const reviewerItems = requested.map((r) => ({
    label: r.cycle.employee.name,
    href: `/reviewer/requests/${r.requestToken}`,
    badge: "to do" as const,
  }));
  const managerItems = seed.cycles.map((cycle) => {
    const employee = personById(cycle.employeeId);
    const nominations = seed.nominations.filter((n) => n.cycleId === cycle.id);
    const submittedCount = nominations.filter((n) => n.status === "SUBMITTED").length;
    const combined = seed.combinedReview.cycleId === cycle.id ? seed.combinedReview : null;
    const status =
      combined?.status === "FINALISED"
        ? "finalised"
        : submittedCount >= 2
          ? "ready"
          : "requested";
    return {
      label: `${employee.name} (${status})`,
      href: `/manager/cycles/${cycle.id}`,
    };
  });
  return [
    { label: "Employee", href: "/employee" },
    { label: "Reviewer", href: "/reviewer", items: reviewerItems },
    { label: "Manager", href: "/manager", items: managerItems },
  ];
}
