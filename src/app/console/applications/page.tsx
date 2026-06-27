import { getConsoleApplications } from "@/lib/cadence/applications";
import { getSessionId } from "@/lib/session";
import { listPersonas } from "@/lib/demo-bank";
import { ApplicationsTable } from "@/components/console/applications-table";
import { SectionTitle } from "@/components/brand/stat";

export default async function ApplicationsPage() {
  const sid = await getSessionId();
  const apps = await getConsoleApplications(sid);
  const personas = listPersonas();
  const taglines = Object.fromEntries(personas.map((p) => [p.id, p.tagline]));

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Applications"
        description="The seeded portfolio plus any application submitted in this session. Click a row to open the full assessment."
      />
      <ApplicationsTable apps={apps} taglines={taglines} />
    </div>
  );
}
