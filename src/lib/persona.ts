import { headers } from "next/headers";
import { getCycleById, getFirstCycle } from "@/lib/json-data";
import { loadReviewState } from "@/lib/runtime/review-artifacts";
import { prisma } from "@/lib/db";

export type Persona = {
  type: "employee" | "reviewer" | "manager";
  name: string;
  jobTitle: string;
};

const JOB_TITLES: Record<Persona["type"], string> = {
  employee: "Employee",
  reviewer: "Reviewer",
  manager: "Manager",
};

export async function getCurrentPersona(): Promise<Persona | null> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("referer") || "";

  // Try to get pathname from Next.js headers (may not be available)
  // We'll use a different approach - pass it as a prop from layout
  return null; // Will be determined in component
}

export async function getPersonaFromPath(pathname: string): Promise<Persona | null> {
  if (process.env.USE_JSON_DATA === "true") {
    if (pathname.startsWith("/employee")) {
      const cycle = getFirstCycle();
      if (!cycle) return null;
      return {
        type: "employee",
        name: cycle.employee.name,
        jobTitle: JOB_TITLES.employee,
      };
    }

    if (pathname.startsWith("/reviewer/requests/")) {
      const token = pathname.split("/reviewer/requests/")[1]?.split("/")[0];
      if (!token) return null;
      const state = await loadReviewState(token);
      if (!state) return null;
      return {
        type: "reviewer",
        name: state.reviewer.name,
        jobTitle: JOB_TITLES.reviewer,
      };
    }

    if (pathname.startsWith("/manager")) {
      const { personById } = await import("@/lib/json-data");
      if (pathname.startsWith("/manager/cycles/")) {
        const cycleId = pathname.split("/manager/cycles/")[1]?.split("/")[0];
        if (!cycleId) return null;
        const cycle = getCycleById(cycleId);
        if (!cycle || !cycle.managerId) return null;
        const manager = personById(cycle.managerId);
        return {
          type: "manager",
          name: manager.name,
          jobTitle: JOB_TITLES.manager,
        };
      }
      // Manager list page - get first cycle's manager
      const cycle = getFirstCycle();
      if (!cycle || !cycle.managerId) return null;
      const manager = personById(cycle.managerId);
      return {
        type: "manager",
        name: manager.name,
        jobTitle: JOB_TITLES.manager,
      };
    }
  } else {
    // Prisma path
    if (pathname.startsWith("/employee")) {
      const cycle = await prisma.reviewCycle.findFirst({
        include: { employee: true },
        orderBy: { createdAt: "desc" },
      });
      if (!cycle) return null;
      return {
        type: "employee",
        name: cycle.employee.name,
        jobTitle: JOB_TITLES.employee,
      };
    }

    if (pathname.startsWith("/reviewer/requests/")) {
      const token = pathname.split("/reviewer/requests/")[1]?.split("/")[0];
      if (!token) return null;
      const nomination = await prisma.nomination.findUnique({
        where: { requestToken: token },
        include: { reviewer: true },
      });
      if (!nomination) return null;
      return {
        type: "reviewer",
        name: nomination.reviewer.name,
        jobTitle: JOB_TITLES.reviewer,
      };
    }

    if (pathname.startsWith("/manager")) {
      if (pathname.startsWith("/manager/cycles/")) {
        const cycleId = pathname.split("/manager/cycles/")[1]?.split("/")[0];
        if (!cycleId) return null;
        const cycle = await prisma.reviewCycle.findUnique({
          where: { id: cycleId },
          include: { manager: true },
        });
        if (!cycle) return null;
        return {
          type: "manager",
          name: cycle.manager.name,
          jobTitle: JOB_TITLES.manager,
        };
      }
      // Manager list page
      const cycle = await prisma.reviewCycle.findFirst({
        include: { manager: true },
        orderBy: { createdAt: "desc" },
      });
      if (!cycle) return null;
      return {
        type: "manager",
        name: cycle.manager.name,
        jobTitle: JOB_TITLES.manager,
      };
    }
  }

  return null;
}
