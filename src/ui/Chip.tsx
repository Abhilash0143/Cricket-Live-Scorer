import React from "react";

export type ChipTone = "neutral" | "green" | "blue" | "purple" | "red";

export function Chip({
  tone = "neutral",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: ChipTone }) {
  const base =
    "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold border";

  const styles =
    tone === "green"
      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-100"
      : tone === "blue"
      ? "bg-blue-500/20 border-blue-500/30 text-blue-100"
      : tone === "purple"
      ? "bg-purple-500/20 border-purple-500/30 text-purple-100"
      : tone === "red"
      ? "bg-red-500/20 border-red-500/30 text-red-100"
      : "bg-white/10 border-white/15 text-white/90";

  return <div {...props} className={`${base} ${styles} ${className}`} />;
}
