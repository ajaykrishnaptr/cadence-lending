import type { ReactNode } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { LearnNav } from "@/components/learn/learn-nav";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      {/* Sub-nav */}
      <div className="sticky top-[calc(33px+3.5rem)] z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <LearnNav />
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            All brands are fictional placeholders. Synthetic data only. No real
            institution is represented.
          </p>
          <p>Built with Claude Code.</p>
        </div>
      </footer>
    </div>
  );
}
