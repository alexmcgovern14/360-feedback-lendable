import { getSidebarSections as getJsonSidebarSections } from "@/lib/json-data";
import { prisma } from "@/lib/db";

export type SidebarItem = {
  label: string;
  href: string;
  badge?: string;
};

export type SidebarSection = {
  label: string;
  href: string;
  items?: SidebarItem[];
};

const FALLBACK_SECTIONS: SidebarSection[] = [
  { label: "Employee", href: "/employee" },
  { label: "Reviewer", href: "/reviewer", items: [] },
  { label: "Manager", href: "/manager", items: [] },
];

export async function getSidebarSections(): Promise<SidebarSection[]> {
  if (process.env.USE_JSON_DATA === "true") {
    return Promise.resolve(getJsonSidebarSections());
  }
  try {
    const reviewerRequests = await prisma.nomination.findMany({
      where: { status: "REQUESTED" },
      include: { cycle: { include: { employee: true } } },
      orderBy: { createdAt: "asc" },
    });

    const cycles = await prisma.reviewCycle.findMany({
      include: { employee: true, nominations: true, combined: true },
      orderBy: { createdAt: "desc" },
    });

    const reviewerItems: SidebarItem[] = reviewerRequests.map((request) => ({
      label: request.cycle.employee.name,
      href: `/reviewer/requests/${request.requestToken}`,
      badge: "to do",
    }));

    const managerItems: SidebarItem[] = cycles.map((cycle) => {
      const submittedCount = cycle.nominations.filter(
        (nomination) => nomination.status === "SUBMITTED",
      ).length;
      const status =
        cycle.combined?.status === "FINALISED"
          ? "finalised"
          : submittedCount >= 2
            ? "ready"
            : "requested";

      return {
        label: `${cycle.employee.name} (${status})`,
        href: `/manager/cycles/${cycle.id}`,
      };
    });

    return [
      { label: "Employee", href: "/employee" },
      { label: "Reviewer", href: "/reviewer", items: reviewerItems },
      { label: "Manager", href: "/manager", items: managerItems },
    ];
  } catch {
    return FALLBACK_SECTIONS;
  }
}
