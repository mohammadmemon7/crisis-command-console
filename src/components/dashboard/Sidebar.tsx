import { AlertTriangle, CheckCircle, Users } from "lucide-react";
import { StatCard } from "./StatCard";
import { DistressForm } from "./DistressForm";

export function Sidebar() {
  return (
    <aside className="w-[300px] shrink-0 flex flex-col border-r border-border"
      style={{ background: "hsl(var(--sidebar-bg))" }}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
            CrisisNet
          </h1>
        </div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase"
          style={{ fontFamily: "var(--font-mono)" }}>
          AI Disaster Command Center
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* Form */}
      <div className="p-5">
        <DistressForm />
      </div>

      <div className="h-px bg-border" />

      {/* Stats */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1"
          style={{ fontFamily: "var(--font-mono)" }}>
          Live Statistics
        </p>
        <StatCard icon={AlertTriangle} label="Active Cases" value={42} />
        <StatCard icon={CheckCircle} label="Resolved Cases" value={187} />
        <StatCard icon={Users} label="Volunteers Deployed" value={314} />
      </div>
    </aside>
  );
}
