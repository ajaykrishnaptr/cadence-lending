import Link from "next/link";
import { CadenceLogo } from "@/components/cadence-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-[33px] z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3.5">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <CadenceLogo size="lg" />
          </Link>
          <span className="hidden h-10 w-px bg-border md:inline-block" />
          <div className="hidden flex-col gap-1 leading-tight md:flex">
            <span className="text-sm font-semibold text-foreground">
              Open Finance Data · Lending Decision Engine
            </span>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
              AI-powered · Gemini + Groq
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/eval">Model eval</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn">Learn</Link>
          </Button>
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}
