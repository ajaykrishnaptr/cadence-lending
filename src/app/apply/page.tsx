import { listPersonas } from "@/lib/demo-bank";
import { ApplyWizard } from "@/components/apply/apply-wizard";

export const metadata = { title: "Apply — Cadence" };

export default function ApplyPage() {
  return <ApplyWizard personas={listPersonas()} />;
}
