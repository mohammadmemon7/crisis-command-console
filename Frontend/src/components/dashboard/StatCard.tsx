import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card p-3.5 border border-border">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "hsl(var(--stat-icon-bg))" }}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none"
          style={{ fontFamily: "var(--font-display)" }}>
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5"
          style={{ fontFamily: "var(--font-mono)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
