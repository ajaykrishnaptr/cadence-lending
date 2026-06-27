import { notFound } from "next/navigation";
import { getSessionId } from "@/lib/session";
import { getProfile } from "@/lib/demo-bank";
import { getDecision, getAccountData } from "@/lib/cadence";
import { resolveApplication, getConsentView, outcomeToStatus } from "@/lib/cadence/applications";
import { getStore } from "@/lib/store";
import { buildRationale } from "@/lib/rationale";
import { ApplicationDetail } from "@/components/console/application-detail";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sid = await getSessionId();
  const resolved = await resolveApplication(sid, id);
  if (!resolved) notFound();

  const profile = getProfile(resolved.personaId);
  if (!profile) notFound();

  const [decision, accountData, consent] = await Promise.all([
    getDecision(resolved.personaId, resolved.request, "seed"),
    getAccountData(resolved.personaId),
    getConsentView(sid, resolved),
  ]);

  const latest = resolved.isSeed ? undefined : await getStore().latestDecision(sid, resolved.appId);
  const officerDecision = latest && latest.decidedBy === "officer" ? latest : null;

  const status = resolved.isSeed ? outcomeToStatus(decision.outcome) : resolved.status;
  const initialRationale = buildRationale(decision, profile.name);

  return (
    <ApplicationDetail
      meta={{
        appId: resolved.appId,
        isSeed: resolved.isSeed,
        personaId: resolved.personaId,
        applicantName: profile.name,
        tagline: profile.tagline,
        expectedLabel: profile.expectedLabel,
        occupation: profile.occupation,
        city: profile.city,
        householdSize: profile.householdSize,
        status,
        submittedAt: resolved.submittedAt,
      }}
      decision={decision}
      accounts={accountData.accounts}
      balanceSeries={accountData.balanceSeries}
      consent={consent ?? null}
      officerDecision={officerDecision}
      initialRationale={initialRationale}
    />
  );
}
