import { Zap } from "lucide-react";

export function MapArea() {
  return (
    <main className="flex-1 relative" style={{ background: "hsl(var(--map-bg))" }}>
      {/* Map placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="h-24 w-24 mx-auto rounded-full border-2 border-border flex items-center justify-center mb-4">
            <svg className="h-12 w-12 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            Map view — connect provider to activate
          </p>
        </div>
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />

      {/* Inject Chaos button */}
      <button className="absolute top-5 right-5 flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-destructive-foreground shadow-lg shadow-destructive/25 transition-all hover:brightness-110 hover:shadow-destructive/40 active:scale-[0.97]">
        <Zap className="h-4 w-4" />
        Inject Chaos
      </button>
    </main>
  );
}
