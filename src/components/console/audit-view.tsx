"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldOff,
  Database,
  Workflow,
  Gavel,
  UserCheck,
  FileText,
  Download,
  Wand2,
} from "lucide-react";
import type { AuditRow } from "@/lib/cadence/applications";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: typeof FileText; tone: string }> = {
  "consent.granted": { icon: ShieldCheck, tone: "text-success-foreground bg-success-muted" },
  "consent.withdrawn": { icon: ShieldOff, tone: "text-danger-foreground bg-danger-muted" },
  "data.pull": { icon: Database, tone: "text-brand bg-brand-muted" },
  categorisation: { icon: Workflow, tone: "text-brand bg-brand-muted" },
  "categorisation.live": { icon: Wand2, tone: "text-brand bg-brand-muted" },
  "decision.engine": { icon: Gavel, tone: "text-warning-foreground bg-warning-muted" },
  "decision.officer": { icon: UserCheck, tone: "text-warning-foreground bg-warning-muted" },
  "application.submitted": { icon: FileText, tone: "text-foreground bg-muted" },
};

const ACTORS = ["all", "applicant", "officer", "system"] as const;

export function AuditView({ events }: { events: AuditRow[] }) {
  const [actor, setActor] = useState<(typeof ACTORS)[number]>("all");
  const shown = useMemo(() => (actor === "all" ? events : events.filter((e) => e.actor === actor)), [events, actor]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cadence-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {ACTORS.map((a) => (
            <button key={a} onClick={() => setActor(a)} className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors", actor === a ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {a}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={exportJson}>
          <Download className="h-3.5 w-3.5" /> Export JSON
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <ol className="divide-y">
          {shown.map((e) => {
            const cfg = ICONS[e.type] ?? { icon: FileText, tone: "text-muted-foreground bg-muted" };
            return (
              <li key={e.id} className="flex gap-3 p-4">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.tone)}>
                  <cfg.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{e.type}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">{e.actor}</span>
                    {e.applicantName !== "—" && <span className="text-[11px] text-muted-foreground">· {e.applicantName}</span>}
                  </div>
                  <p className="mt-1 text-sm">{e.message}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">No audit events for this filter.</li>}
        </ol>
      </div>
    </div>
  );
}
