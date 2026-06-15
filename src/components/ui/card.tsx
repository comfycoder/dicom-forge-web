import * as React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card text-card-foreground", className)}
      {...props}
    />
  );
}

export function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "success" | "danger";
}) {
  return (
    <div className="rounded-md bg-secondary px-2.5 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-medium",
          accent === "success" && "text-success",
          accent === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}
