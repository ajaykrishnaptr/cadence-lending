"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CategorisedTransaction } from "@/lib/types";
import { formatDate, formatSigned } from "@/lib/format";
import { CategoryBadge } from "@/components/brand/badges";
import { ConfidenceBar } from "@/components/brand/score-ring";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ExplainState {
  open: (title: string, ids: string[], description?: string) => void;
  has: boolean;
}

const Ctx = createContext<ExplainState | null>(null);

/**
 * Deep clickable explainability. Any figure on the page can be wrapped so that
 * clicking it drills straight to the exact source transactions that produced it.
 */
export function ExplainProvider({
  transactions,
  children,
}: {
  transactions: CategorisedTransaction[];
  children: ReactNode;
}) {
  const byId = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);
  const [state, setState] = useState<{ title: string; ids: string[]; description?: string } | null>(null);

  const value = useMemo<ExplainState>(
    () => ({
      has: transactions.length > 0,
      open: (title, ids, description) => setState({ title, ids, description }),
    }),
    [transactions.length],
  );

  const shown = state ? state.ids.map((id) => byId.get(id)).filter(Boolean) as CategorisedTransaction[] : [];
  const total = shown.reduce((s, t) => s + t.amount, 0);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={!!state} onOpenChange={(o) => !o && setState(null)}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{state?.title}</SheetTitle>
            <SheetDescription>
              {state?.description ?? "Source transactions behind this figure."}{" "}
              {shown.length} {shown.length === 1 ? "line" : "lines"} · net {formatSigned(total)}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <ul className="divide-y">
              {shown.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.description}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <CategoryBadge category={t.categorisation.category} />
                      <span className="text-xs text-muted-foreground">{formatDate(t.bookingDate)}</span>
                    </div>
                    <div className="mt-1.5"><ConfidenceBar value={t.categorisation.confidence} /></div>
                  </div>
                  <span className={cn("shrink-0 font-mono text-sm tabular-nums", t.amount < 0 ? "text-foreground" : "text-success-foreground")}>
                    {formatSigned(t.amount)}
                  </span>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  No underlying transactions for this figure (e.g. a standard allowance).
                </li>
              )}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}

function useExplain() {
  return useContext(Ctx);
}

/** Wrap a figure to make it drill to its source transactions on click. */
export function Explain({
  ids,
  title,
  description,
  children,
  className,
  disabled,
}: {
  ids: string[];
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const ctx = useExplain();
  if (!ctx || disabled || ids.length === 0) {
    return <span className={className}>{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => ctx.open(title, ids, description)}
      className={cn(
        "group inline-flex items-center gap-1 rounded underline decoration-dotted decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        className,
      )}
      title="Show source transactions"
    >
      {children}
      <ArrowUpRight className="h-3 w-3 text-brand opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
