import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 focus-within:border-white/30 focus-within:ring-2 focus-within:ring-white/10">
      <input
        {...props}
        className={[
          "w-full bg-transparent outline-none",
          "text-white placeholder:text-white/40",
          props.className ?? "",
        ].join(" ")}
      />
    </div>
  );
}
