import React from "react";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative rounded-2xl bg-white/10 border border-white/15 px-4 py-3 focus-within:border-white/30 focus-within:ring-2 focus-within:ring-white/10">
      <select
        {...props}
        className={[
          "w-full bg-transparent outline-none appearance-none",
          "text-white",
          props.className ?? "",
        ].join(" ")}
      >
        {props.children}
      </select>

      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
        ▼
      </div>
    </div>
  );
}
