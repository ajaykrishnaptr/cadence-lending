import Link from "next/link";
import { CadenceLogo } from "@/components/cadence-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const { next, role } = await searchParams;
  const preferred = role === "officer" || role === "applicant" ? role : undefined;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="hero-glow pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <CadenceLogo />
        </Link>
        <LoginForm next={next} preferred={preferred} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Mock authentication — no real accounts. Credentials are shown above for
          convenience. Synthetic data only.
        </p>
      </div>
    </div>
  );
}
