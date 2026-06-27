import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function LearnHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b">
      <div className="hero-glow pointer-events-none absolute inset-0 opacity-70" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <span className="text-xs font-medium uppercase tracking-wide text-brand">
          {eyebrow}
        </span>
        <h1 className="mt-3 max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p>
      </div>
    </header>
  );
}

export function LearnSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      <div>
        {eyebrow && (
          <span className="text-xs font-medium uppercase tracking-wide text-brand">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-1.5 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function LearnCard({
  title,
  children,
  icon,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6", className)}>
      {title && (
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
              {icon}
            </span>
          )}
          <h3 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h3>
        </div>
      )}
      <div className={cn("text-sm text-muted-foreground", title && "mt-3")}>
        {children}
      </div>
    </div>
  );
}

export function NextPageLink({
  href,
  label,
  title,
}: {
  href: string;
  label: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border bg-card p-6 transition-all hover:border-brand/40 hover:shadow-md"
    >
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="mt-1 font-heading text-lg font-semibold tracking-tight">
          {title}
        </div>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-brand transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
