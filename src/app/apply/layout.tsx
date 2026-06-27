import Link from "next/link";
import { X } from "lucide-react";
import { CadenceLogo } from "@/components/cadence-logo";
import { ModeToggle } from "@/components/mode-toggle";

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-muted/40 via-background to-background">
      <header className="sticky top-[33px] z-40 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/"><CadenceLogo /></Link>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <Link href="/" className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Exit">
              <X className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
