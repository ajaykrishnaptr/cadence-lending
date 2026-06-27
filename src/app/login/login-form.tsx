"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Wand2, ArrowRight } from "lucide-react";
import { loginAs } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "officer" | "applicant";

const CREDS: Record<Role, { email: string; password: string; title: string; desc: string; icon: typeof User }> = {
  officer: {
    email: "officer@cadence.demo",
    password: "demo",
    title: "Loan officer",
    desc: "Portfolio console, affordability, decisions, audit log.",
    icon: Building2,
  },
  applicant: {
    email: "applicant@demo.bank",
    password: "demo",
    title: "Applicant",
    desc: "Run an application: consent, bank connect, submit.",
    icon: User,
  },
};

export function LoginForm({ next, preferred }: { next?: string; preferred?: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(preferred ?? "officer");
  const [email, setEmail] = useState(CREDS[preferred ?? "officer"].email);
  const [password, setPassword] = useState("demo");
  const [pending, startTransition] = useTransition();

  function selectRole(r: Role) {
    setRole(r);
    setEmail(CREDS[r].email);
    setPassword(CREDS[r].password);
  }

  function autofill() {
    setEmail(CREDS[role].email);
    setPassword(CREDS[role].password);
  }

  function submit() {
    startTransition(async () => {
      const res = await loginAs(role, next);
      router.push(res.redirect);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="font-heading text-xl font-semibold tracking-tight">Sign in to Cadence</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a role to explore the demo.</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {(Object.keys(CREDS) as Role[]).map((r) => {
          const c = CREDS[r];
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => selectRole(r)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                active ? "border-brand bg-brand-muted/60 ring-1 ring-brand/30" : "hover:border-brand/30",
              )}
            >
              <c.icon className={cn("h-4 w-4", active ? "text-brand" : "text-muted-foreground")} />
              <span className="text-sm font-medium">{c.title}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{c.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-dashed bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Demo access</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={autofill}>
            <Wand2 className="h-3.5 w-3.5" /> Autofill
          </Button>
        </div>
        <div className="mt-1 font-mono text-xs text-foreground/80">
          {CREDS[role].email} · {CREDS[role].password}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>

      <Button className="mt-5 w-full" onClick={submit} disabled={pending}>
        {pending ? "Signing in…" : <>Continue as {CREDS[role].title.toLowerCase()} <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </div>
  );
}
