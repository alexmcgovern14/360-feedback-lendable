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
    "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const styles: Record<string, string> = {
    primary: "bg-accent text-white hover:bg-[#b34209] focus-visible:outline-accent",
    secondary:
      "border border-link text-link hover:bg-background focus-visible:outline-link",
    ghost: "text-link hover:bg-background focus-visible:outline-link",
  };

  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
