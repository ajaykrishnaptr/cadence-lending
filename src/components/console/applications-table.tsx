"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search, Sparkles } from "lucide-react";
import type { AppListItem } from "@/lib/cadence/applications";
import { formatEUR } from "@/lib/format";
import { purposeLabel } from "@/lib/labels";
import { OutcomeBadge, StatusBadge } from "@/components/brand/badges";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

type SortKey = "name" | "amount" | "available" | "dti";

const FILTERS: { key: ApplicationStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "referred", label: "Referred" },
  { key: "declined", label: "Declined" },
];

export function ApplicationsTable({
  apps,
  taglines,
}: {
  apps: AppListItem[];
  taglines: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("available");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    let r = apps.filter((a) => (filter === "all" ? true : a.status === filter));
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((a) => a.applicantName.toLowerCase().includes(q) || purposeLabel(a.request.purpose).toLowerCase().includes(q));
    }
    r = [...r].sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.applicantName.localeCompare(b.applicantName);
      else if (sort === "amount") cmp = a.request.amount - b.request.amount;
      else if (sort === "available") cmp = a.available - b.available;
      else cmp = a.dti - b.dti;
      return asc ? cmp : -cmp;
    });
    return r;
  }, [apps, filter, query, sort, asc]);

  function toggleSort(key: SortKey) {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicant or purpose" className="pl-8" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <Th onClick={() => toggleSort("name")}>Applicant</Th>
              <Th onClick={() => toggleSort("amount")} className="text-right">Request</Th>
              <Th className="hidden text-right md:table-cell">Net / mo</Th>
              <Th onClick={() => toggleSort("available")} className="text-right">Available</Th>
              <Th onClick={() => toggleSort("dti")} className="hidden text-right sm:table-cell">DTI</Th>
              <Th>Engine</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="group border-b last:border-0 transition-colors hover:bg-muted/40">
                <td className="px-3 py-3">
                  <Link href={`/console/applications/${a.id}`} className="block">
                    <div className="flex items-center gap-2 font-medium">
                      {a.applicantName}
                      {!a.isSeed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand">
                          <Sparkles className="h-2.5 w-2.5" /> New
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{taglines[a.personaId] ?? purposeLabel(a.request.purpose)}</div>
                  </Link>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <div className="font-medium">{formatEUR(a.request.amount, false)}</div>
                  <div className="text-xs text-muted-foreground">{a.request.termMonths} mo · {purposeLabel(a.request.purpose)}</div>
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground md:table-cell">{formatEUR(a.monthlyNet, false)}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className={cn("font-medium", a.available < 0 ? "text-danger-foreground" : "")}>{formatEUR(a.available, false)}</span>
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                  <span className={cn(a.dti > 0.4 ? "text-danger-foreground" : "text-muted-foreground")}>{(a.dti * 100).toFixed(0)}%</span>
                </td>
                <td className="px-3 py-3"><OutcomeBadge outcome={a.outcome} label={a.outcomeLabel} size="sm" /></td>
                <td className="px-3 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No applications match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", className)}>
      {onClick ? (
        <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
          {children}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}
