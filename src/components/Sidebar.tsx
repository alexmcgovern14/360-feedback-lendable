import Link from "next/link";
import type { SidebarSection } from "@/lib/sidebar";

type SidebarProps = {
  sections: SidebarSection[];
};

export function Sidebar({ sections }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface px-5 py-6">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wide text-muted">
          Lendable
        </div>
        <div className="text-lg font-semibold text-foreground">
          360 Feedback
        </div>
      </div>
      <nav className="space-y-5 text-sm">
        {sections.map((section) => (
          <div key={section.href} className="space-y-2">
            <Link
              className="block font-semibold text-foreground hover:text-primary"
              href={section.href}
            >
              {section.label}
            </Link>
            {section.items && section.items.length > 0 ? (
              <div className="space-y-1 pl-3 text-xs text-muted">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded px-2 py-1 text-muted hover:bg-background hover:text-foreground"
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="rounded bg-info-bg px-1.5 py-0.5 text-[10px] uppercase text-primary">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
