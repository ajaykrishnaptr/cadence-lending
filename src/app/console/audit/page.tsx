import { getSessionId } from "@/lib/session";
import { getConsoleAudit } from "@/lib/cadence/applications";
import { SectionTitle } from "@/components/brand/stat";
import { AuditView } from "@/components/console/audit-view";

export default async function AuditPage() {
  const sid = await getSessionId();
  const events = await getConsoleAudit(sid);
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Audit log"
        description="Append-only, timestamped record of every consent, data pull, categorisation, decision and officer action. Exportable as JSON."
      />
      <AuditView events={events} />
    </div>
  );
}
