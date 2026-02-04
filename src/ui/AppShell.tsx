import React from "react";
import { Card } from "./Card";

export function AppShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 pb-24">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-extrabold tracking-tight truncate">{title}</div>
              {subtitle ? (
                <div className="text-white/60 mt-1 text-sm">{subtitle}</div>
              ) : null}
            </div>

            {/* ✅ Key fix: right section can wrap, won't overflow */}
            {right ? (
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {right}
              </div>
            ) : null}
          </div>

          {/* Content */}
          <div className="mt-2 grid gap-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
