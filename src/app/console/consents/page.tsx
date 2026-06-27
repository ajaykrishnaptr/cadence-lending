import { getSessionId } from "@/lib/session";
import { getConsoleConsents } from "@/lib/cadence/applications";
import { SectionTitle } from "@/components/brand/stat";
import { ConsentsView } from "@/components/console/consents-view";

export default async function ConsentsPage() {
  const sid = await getSessionId();
  const consents = await getConsoleConsents(sid);
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Consents"
        description="Active account-information consents, their 180-day expiry, and the scopes granted. Revoking flips the console to a data-hidden state."
      />
      <ConsentsView consents={consents} />
    </div>
  );
}
