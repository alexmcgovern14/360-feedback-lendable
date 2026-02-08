import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
};

export function Textarea({
  label,
  helperText,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <label className="block space-y-2 text-sm">
      {label ? <span className="font-semibold text-foreground">{label}</span> : null}
      <textarea
        className={`w-full resize-y rounded-lg border border-border/70 bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-offset-2 focus:ring-2 focus:ring-link/40 ${className}`}
        {...props}
      />
      {helperText ? (
        <span className="block text-xs text-muted">{helperText}</span>
      ) : null}
    </label>
  );
}
