import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { getSidebarSections } from "@/lib/sidebar";

export const dynamic = "force-dynamic";

type ShellLayoutProps = {
  children: ReactNode;
};

export default async function ShellLayout({ children }: ShellLayoutProps) {
  const sections = await getSidebarSections();

  return (
    <div className="flex h-screen min-h-0 bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 min-h-0">
        <Sidebar sections={sections} />
        <main className="min-h-0 flex-1 overflow-auto px-8 py-8">
          <div className="mx-auto w-full max-w-[var(--content-max)] space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
