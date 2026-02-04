import React from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  type,
  children,
  ...props
}: Props) {
  const base =
    [
      "inline-flex items-center justify-center gap-2",
      "select-none whitespace-nowrap",
      "rounded-2xl font-semibold",
      "transition-[transform,background,box-shadow,border-color,opacity] duration-150",
      "active:scale-[0.98]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none focus:ring-2 focus:ring-white/15",
      "border",
    ].join(" ");

  const sizes =
    size === "sm"
      ? "h-10 px-3 text-sm"
      : size === "lg"
      ? "h-12 px-5 text-base"
      : "h-11 px-4 text-sm";

  // Tactile styles (glass-friendly)
  const variants =
    variant === "primary"
      ? [
          "border-transparent",
          "text-black",
          "bg-gradient-to-r from-emerald-400 to-blue-500",
          "shadow-[0_14px_40px_rgba(0,0,0,0.45)]",
          "hover:shadow-[0_18px_55px_rgba(0,0,0,0.55)]",
        ].join(" ")
      : variant === "danger"
      ? [
          "text-red-100",
          "bg-red-500 hover:bg-red-500",
          "border-red-500 hover:border-red-400",
          "shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
        ].join(" ")
      : variant === "soft"
      ? [
          "text-white",
          "bg-white/10 hover:bg-white/16",
          "border-white/12 hover:border-white/20",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),_0_10px_24px_rgba(0,0,0,0.35)]",
        ].join(" ")
      : [
          // ghost
          "text-white",
          "bg-white/0 hover:bg-white/10",
          "border-white/10 hover:border-white/18",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        ].join(" ");

  const width = full ? "w-full" : "";

  return (
    <button
      {...props}
      type={type ?? "button"}
      className={`${base} ${sizes} ${variants} ${width} ${className}`}
    >
      {children}
    </button>
  );
}
