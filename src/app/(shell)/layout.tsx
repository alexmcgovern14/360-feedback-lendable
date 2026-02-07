import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { getSidebarSections } from "@/lib/sidebar";

type ShellLayoutProps = {
  children: ReactNode;
};

export default async function ShellLayout({ children }: ShellLayoutProps) {
  const sections = await getSidebarSections();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px]">
        <Sidebar sections={sections} />
        <main className="flex-1 px-8 py-8">
          <div className="mx-auto w-full max-w-[var(--content-max)] space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
