type StatusPillProps = {
  label: string;
  tone?: "neutral" | "info" | "success";
};

const toneStyles: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  neutral: "bg-background text-muted border border-border",
  info: "bg-info-bg text-primary border border-info-border",
  success: "bg-[#e7f6ee] text-[#1d6a3b] border border-[#ccead9]",
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}
