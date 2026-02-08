import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const styles: Record<string, string> = {
    primary:
      "bg-accent text-white shadow-sm hover:bg-[#b34209] focus-visible:outline-accent",
    secondary:
      "border border-border text-foreground hover:bg-surface focus-visible:outline-link",
    ghost: "text-foreground hover:bg-surface focus-visible:outline-link",
  };

  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
