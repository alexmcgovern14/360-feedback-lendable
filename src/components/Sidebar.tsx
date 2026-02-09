"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarSection } from "@/lib/sidebar";
import { LoggedInUser } from "@/components/LoggedInUser";

type SidebarProps = {
  sections: SidebarSection[];
};

export function Sidebar({ sections }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-border/60 bg-surface/95 px-5 py-6 backdrop-blur">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-wide text-muted">
          Lendable
        </div>
        <div className="text-lg font-semibold text-foreground">
          360 Feedback
        </div>
      </div>
      <div className="mb-6">
        <LoggedInUser />
      </div>
      <nav className="space-y-5 text-sm">
        {sections.map((section) => {
          const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <div key={section.href} className="space-y-2">
              <Link
                className={`block rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-gray-200 text-foreground"
                    : "text-foreground hover:text-primary"
                }`}
                href={section.href}
              >
                {section.label}
              </Link>
              {section.items && section.items.length > 0 ? (
                <div className="space-y-1 pl-3 text-xs text-muted">
                  {section.items.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                          isItemActive
                            ? "bg-gray-200 text-foreground"
                            : "text-muted hover:bg-background hover:text-foreground"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-info-bg px-2 py-0.5 text-[10px] uppercase text-primary">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
