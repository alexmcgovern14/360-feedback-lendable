import type { ReactNode } from "react";

type CollapsibleProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function Collapsible({ title, children, defaultOpen }: CollapsibleProps) {
  return (
    <details className="rounded border border-border bg-surface p-4" open={defaultOpen}>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        {title}
      </summary>
      <div className="mt-3 text-sm text-foreground">{children}</div>
    </details>
  );
}
