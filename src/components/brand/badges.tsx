import { cn } from "@/lib/utils";
import { CATEGORY_META, type Category } from "@/lib/categories";
import type { ApplicationStatus, DecisionOutcome } from "@/lib/types";

export function CategoryBadge({
  category,
  className,
  withDot = true,
}: {
  category: Category;
  className?: string;
  withDot?: boolean;
}) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        meta.badge,
        className,
      )}
    >
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />}
      {meta.label}
    </span>
  );
}

const OUTCOME_STYLES: Record<DecisionOutcome, string> = {
  approve:
    "bg-success-muted text-success-foreground ring-success/30 [&_.dot]:bg-success",
  refer:
    "bg-warning-muted text-warning-foreground ring-warning/30 [&_.dot]:bg-warning",
  decline:
    "bg-danger-muted text-danger-foreground ring-danger/30 [&_.dot]:bg-danger",
};

export function OutcomeBadge({
  outcome,
  label,
  className,
  size = "md",
}: {
  outcome: DecisionOutcome;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        OUTCOME_STYLES[outcome],
        className,
      )}
    >
      <span className="dot h-1.5 w-1.5 rounded-full" />
      {label ?? (outcome === "approve" ? "Approve" : outcome === "refer" ? "Refer" : "Decline")}
    </span>
  );
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  referred: "Referred",
  declined: "Declined",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-brand-muted text-brand ring-brand/25 [&_.dot]:bg-brand",
  approved: "bg-success-muted text-success-foreground ring-success/30 [&_.dot]:bg-success",
  referred: "bg-warning-muted text-warning-foreground ring-warning/30 [&_.dot]:bg-warning",
  declined: "bg-danger-muted text-danger-foreground ring-danger/30 [&_.dot]:bg-danger",
};

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="dot h-1.5 w-1.5 rounded-full" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RuleStatusPill({ status }: { status: "pass" | "refer" | "fail" }) {
  const map = {
    pass: { label: "Pass", cls: "bg-success-muted text-success-foreground ring-success/30" },
    refer: { label: "Refer", cls: "bg-warning-muted text-warning-foreground ring-warning/30" },
    fail: { label: "Fail", cls: "bg-danger-muted text-danger-foreground ring-danger/30" },
  }[status];
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", map.cls)}>
      {map.label}
    </span>
  );
}
