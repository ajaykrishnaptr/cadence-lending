"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ConsentRow } from "@/lib/cadence/applications";
import { formatDate, daysUntil } from "@/lib/format";
import { bankName } from "@/lib/demo-bank/banks";
import { withdrawConsentAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConsentsView({ consents }: { consents: ConsentRow[] }) {
  const router = useRouter();
  const [withdrawnIds, setWithdrawnIds] = useState<Set<string>>(
    new Set(consents.filter((c) => c.status === "withdrawn").map((c) => c.id)),
  );
  const [pending, start] = useTransition();

  function revoke(c: ConsentRow) {
    start(async () => {
      if (c.source === "session") {
        const res = await withdrawConsentAction({ consentId: c.id, applicationId: c.applicationId });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        router.refresh();
      }
      setWithdrawnIds((s) => new Set(s).add(c.id));
      toast.success("Consent withdrawn", { description: `${c.applicantName}'s account data is now hidden in the console.` });
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Applicant</th>
            <th className="px-4 py-2.5 font-medium">Bank</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">Scopes</th>
            <th className="px-4 py-2.5 font-medium">Granted</th>
            <th className="px-4 py-2.5 font-medium">Expiry (180 days)</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {consents.map((c) => {
            const withdrawn = withdrawnIds.has(c.id);
            const days = daysUntil(c.expiresAt);
            const scopeCount = Object.values(c.scope).filter(Boolean).length;
            return (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/console/applications/${c.applicationId}`} className="group inline-flex items-center gap-1.5 font-medium hover:text-brand">
                    {c.applicantName}
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {bankName(c.bankId)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(Object.entries(c.scope) as [string, boolean][]).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="rounded-md bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand">{k}</span>
                    ))}
                    <span className="text-[10px] text-muted-foreground">{scopeCount}/4</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(c.grantedAt.slice(0, 10))}</td>
                <td className="px-4 py-3 tabular-nums">
                  <div>{formatDate(c.expiresAt.slice(0, 10))}</div>
                  {!withdrawn && <ExpiryBar days={days} />}
                </td>
                <td className="px-4 py-3">
                  {withdrawn ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-muted px-2.5 py-1 text-xs font-medium text-danger-foreground ring-1 ring-inset ring-danger/30">
                      <ShieldOff className="h-3 w-3" /> Withdrawn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2.5 py-1 text-xs font-medium text-success-foreground ring-1 ring-inset ring-success/30">
                      <ShieldCheck className="h-3 w-3" /> Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!withdrawn && (
                    <Button size="sm" variant="ghost" className="text-danger-foreground" onClick={() => revoke(c)} disabled={pending}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpiryBar({ days }: { days: number }) {
  const pct = Math.max(0, Math.min(1, days / 180));
  const tone = days > 60 ? "bg-success" : days > 21 ? "bg-warning" : "bg-danger";
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{days}d left</span>
    </div>
  );
}
