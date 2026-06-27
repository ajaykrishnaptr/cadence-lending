import { cn } from "@/lib/utils";

/**
 * Cadence mark — an equalizer of bars representing the "rhythm" the engine
 * reads in a applicant's cash flow (salary cadence, recurring payments).
 * The signature motif of the brand.
 */
export function CadenceMark({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  // bar heights chosen to read like a steady cash-flow waveform
  const bars = [0.45, 0.8, 0.6, 1, 0.7, 0.5, 0.85];
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-end justify-center gap-[2px] rounded-md bg-brand p-[5px]",
        className,
      )}
      aria-hidden
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[2px] flex-1 rounded-full bg-brand-foreground",
            animate && "cadence-bar",
          )}
          style={{
            height: `${h * 100}%`,
            animationDelay: animate ? `${i * 0.12}s` : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function CadenceLogo({
  className,
  animate = false,
  size = "default",
}: {
  className?: string;
  animate?: boolean;
  size?: "default" | "lg";
}) {
  const big = size === "lg";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CadenceMark animate={animate} className={big ? "h-9 w-9" : undefined} />
      <span
        className={cn(
          "font-heading font-semibold tracking-tight",
          big ? "text-2xl" : "text-lg",
        )}
      >
        Cadence
      </span>
    </span>
  );
}
