import { cn } from "@/lib/utils";

/**
 * The brand signature: a cash-flow "rhythm" waveform. Bar heights are a fixed
 * pseudo-random sequence shaped to read like a statement's monthly pulse —
 * tall salary spikes, steady recurring bars, scattered discretionary blips.
 */
const SEQUENCE = [
  0.3, 0.55, 0.4, 0.95, 0.5, 0.35, 0.6, 0.45, 0.8, 0.4, 0.3, 0.7, 0.5, 0.92,
  0.45, 0.38, 0.62, 0.5, 0.34, 0.75, 0.48, 0.4, 0.58, 0.88, 0.42, 0.33, 0.66,
  0.5, 0.36, 0.7, 0.46, 0.9, 0.4, 0.55, 0.32, 0.6, 0.5, 0.78, 0.44, 0.3,
];

export function Waveform({
  bars = 40,
  animate = false,
  className,
  barClassName,
}: {
  bars?: number;
  animate?: boolean;
  className?: string;
  barClassName?: string;
}) {
  const items = Array.from({ length: bars }, (_, i) => SEQUENCE[i % SEQUENCE.length]);
  return (
    <div className={cn("flex h-full w-full items-end gap-[3px]", className)} aria-hidden>
      {items.map((h, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-full bg-brand/70",
            animate && "cadence-bar",
            barClassName,
          )}
          style={{
            height: `${h * 100}%`,
            animationDelay: animate ? `${(i % 12) * 0.09}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
