import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
};

export function Input({ label, helperText, className = "", ...props }: InputProps) {
  return (
    <label className="block space-y-2 text-sm">
      {label ? <span className="font-semibold text-foreground">{label}</span> : null}
      <input
        className={`w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-offset-2 focus:ring-2 focus:ring-link ${className}`}
        {...props}
      />
      {helperText ? (
        <span className="block text-xs text-muted">{helperText}</span>
      ) : null}
    </label>
  );
}
