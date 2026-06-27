import { notFound } from "next/navigation";
import { getSessionId } from "@/lib/session";
import { getProfile } from "@/lib/demo-bank";
import { getDecision, getAccountData } from "@/lib/cadence";
import { resolveApplication, getConsentViews, outcomeToStatus } from "@/lib/cadence/applications";
import { getStore } from "@/lib/store";
import { buildRationale } from "@/lib/rationale";
import { originationChecks } from "@/lib/origination";
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

  const banks = resolved.connectedBanks ?? undefined;
  const [decision, accountData, consents] = await Promise.all([
    getDecision(resolved.personaId, resolved.request, "seed", undefined, banks),
    getAccountData(resolved.personaId, banks),
    getConsentViews(sid, resolved),
  ]);

  const [latest, auditRows] = await Promise.all([
    getStore().latestDecision(sid, resolved.appId),
    getStore().listAudit(sid, resolved.appId),
  ]);
  const officerDecision = latest && latest.decidedBy === "officer" ? latest : null;
  const humanReviewRequested = auditRows.some((a) => a.type === "art22.human_review_requested");
  const checks = originationChecks(resolved.personaId, decision);

  // An officer override (incl. on a seeded app) wins; otherwise the engine
  // outcome for seed apps, or the stored status for session apps.
  const status = officerDecision
    ? outcomeToStatus(officerDecision.outcome)
    : resolved.isSeed
      ? outcomeToStatus(decision.outcome)
      : resolved.status;
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
      consents={consents}
      officerDecision={officerDecision}
      initialRationale={initialRationale}
      checks={checks}
      humanReviewRequested={humanReviewRequested}
    />
  );
}
