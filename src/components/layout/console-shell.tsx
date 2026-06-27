"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  Inbox,
  ShieldCheck,
  ScrollText,
  Home,
  Activity,
  BookOpen,
  RotateCcw,
  LogOut,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { CadenceLogo } from "@/components/cadence-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { resetDemoData, logout } from "@/lib/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/console/applications", label: "Applications", icon: Inbox },
  { href: "/console/consents", label: "Consents", icon: ShieldCheck },
  { href: "/console/audit", label: "Audit log", icon: ScrollText },
  { href: "/console/mortgage", label: "Mortgage — next", icon: Home, soon: true },
];

const SECONDARY = [
  { href: "/eval", label: "Model eval", icon: Activity },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

export function ConsoleShell({
  children,
  persistence,
}: {
  children: React.ReactNode;
  persistence: "neon" | "memory";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(item: (typeof NAV)[number]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  function doReset() {
    startTransition(async () => {
      await resetDemoData();
      toast.success("Demo data reset", { description: "Your session's applications, consents and audit entries were cleared." });
      router.refresh();
    });
  }

  function exitConsole() {
    startTransition(async () => {
      await logout();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-33px)]">
      {/* Sidebar */}
      <aside className="sticky top-[33px] hidden h-[calc(100vh-33px)] w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/console"><CadenceLogo /></Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Console</p>
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} />
          ))}
          <div className="my-2 border-t" />
          <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reference</p>
          {SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
            <Database className="h-3 w-3" />
            {persistence === "neon" ? "Neon Postgres" : "In-memory store"}
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={doReset} disabled={pending}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset my demo data
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-[33px] z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Inbox className="h-5 w-5" />
            </button>
            <span className="rounded-full bg-brand-muted px-2.5 py-1 text-xs font-medium text-brand">
              Loan officer
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={exitConsole} disabled={pending}>
              <LogOut className="h-3.5 w-3.5" /> Exit console
            </Button>
            <ModeToggle />
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b bg-card p-3 lg:hidden">
            <div className="grid grid-cols-2 gap-1">
              {[...NAV, ...SECONDARY].map((item) => (
                <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full gap-2" onClick={doReset} disabled={pending}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset my demo data
            </Button>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: { href: string; label: string; icon: typeof Inbox; soon?: boolean };
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-brand text-brand-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon && (
        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase", active ? "bg-brand-foreground/20" : "bg-muted text-muted-foreground")}>
          Soon
        </span>
      )}
    </Link>
  );
}
