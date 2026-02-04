import React from "react";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={[
        "rounded-3xl p-5",
        "bg-white/10 border border-white/15",
        "shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
        "backdrop-blur-xl",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
