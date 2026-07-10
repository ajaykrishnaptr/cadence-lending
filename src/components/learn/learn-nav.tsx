"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/learn", label: "How it works" },
  { href: "/learn/categoriser", label: "The categoriser" },
  { href: "/learn/evals", label: "How the AI is evaluated" },
  { href: "/learn/affordability", label: "Affordability engine" },
  { href: "/learn/architecture", label: "Architecture & extensions" },
];

export function LearnNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-brand/40 bg-brand-muted text-brand"
                : "bg-card text-muted-foreground hover:border-brand/30 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
