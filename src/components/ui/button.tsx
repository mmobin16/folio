import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-ink text-sheet hover:bg-[#322b26]",
  secondary: "border border-line bg-sheet text-ink hover:border-ink/30",
  ghost: "text-ink hover:bg-ink/5",
  danger: "text-danger hover:bg-danger/10",
} as const;

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
