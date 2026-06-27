import { cn } from "@/lib/utils";

/**
 * A compact score ring used for stability, confidence and DTI dials. The
 * stroke colour follows the value's health band so the officer reads it at a
 * glance.
 */
export function ScoreRing({
  value,
  label,
  sublabel,
  size = 72,
  stroke = 7,
  tone = "auto",
  className,
}: {
  /** 0–1. */
  value: number;
  label?: string;
  sublabel?: string;
  size?: number;
  stroke?: number;
  tone?: "auto" | "brand" | "success" | "warning" | "danger";
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const offset = c * (1 - pct);

  const band =
    tone !== "auto"
      ? tone
      : pct >= 0.8
        ? "success"
        : pct >= 0.55
          ? "warning"
          : "danger";
  const colorVar = {
    brand: "var(--brand)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
  }[band];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colorVar}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-sm font-semibold tabular-nums leading-none">
          {label ?? `${Math.round(pct * 100)}%`}
        </span>
        {sublabel && <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}

export function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone = pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
