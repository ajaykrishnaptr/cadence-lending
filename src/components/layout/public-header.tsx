import Link from "next/link";
import { CadenceLogo } from "@/components/cadence-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-[33px] z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <CadenceLogo />
        </Link>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/eval">Model eval</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn">Learn</Link>
          </Button>
          <ModeToggle />
          <Button size="sm" asChild className="ml-1">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
