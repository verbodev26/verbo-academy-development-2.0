import type { ReactNode } from "react";
import { UserRound } from "lucide-react";

// TODO: reemplazar con foto real
export function PhotoPlaceholder({
  className = "",
  tone = "light",
  shape = "rounded",
}: {
  className?: string;
  tone?: "light" | "dark";
  shape?: "rounded" | "circle";
}) {
  const bg = tone === "light" ? "bg-[var(--navy-100)]" : "bg-white/15";
  const iconColor = tone === "light" ? "text-[var(--navy-300)]" : "text-white/50";
  const radius = shape === "circle" ? "rounded-full" : "rounded-[1.75rem]";
  return (
    <div
      className={`flex items-center justify-center ${radius} ${bg} ${className}`}
      aria-hidden
    >
      <UserRound className={`h-10 w-10 ${iconColor}`} strokeWidth={1.5} />
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-border bg-card p-6 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" | "muted" | "elite" }) {
  const tones: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-foreground",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
    elite: "bg-[var(--tier-elite-soft)] text-[var(--tier-elite)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-soft transition-opacity hover:opacity-90 disabled:opacity-40 shadow-sm transition-transform duration-150 ease-out active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary transition-transform duration-150 ease-out active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  );
}

export function SuccessButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-success px-4 py-2 text-sm font-medium text-success-foreground shadow-soft transition-opacity hover:opacity-90 transition-transform duration-150 ease-out active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  );
}

/** Minimal SVG circular progress ring (right-aligned inside KPI cards). */
export function StatRing({
  value,
  size = 64,
  stroke = 6,
  label,
  trackColor = "rgba(1, 48, 74, 0.08)",
  progressColor = "#f38934",
  textColor = "#01304a",
  valueClassName,
}: { value: number; size?: number; stroke?: number; label?: string; trackColor?: string; progressColor?: string; textColor?: string; valueClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center tabular-nums ${valueClassName ?? "text-[11px] font-semibold"}`} style={{ color: textColor }}>
        {label ?? `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-black">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
