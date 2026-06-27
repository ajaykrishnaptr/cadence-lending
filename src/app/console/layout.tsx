import { ConsoleShell } from "@/components/layout/console-shell";
import { storeKind } from "@/lib/store";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell persistence={storeKind()}>{children}</ConsoleShell>;
}
