import { FlaskConical } from "lucide-react";

/**
 * Persistent, unmissable reminder that everything here is synthetic.
 * Required by the prototype guardrails — never gated, always visible.
 */
export function DemoRibbon() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-warm/30 bg-warm-muted px-4 py-1.5 text-center text-[12px] font-medium text-warm-foreground/90">
      <FlaskConical className="h-3.5 w-3.5 shrink-0 text-warm" />
      <span className="text-foreground/80">
        Demo — synthetic data, not a live system. No real institutions are
        represented.
      </span>
    </div>
  );
}
