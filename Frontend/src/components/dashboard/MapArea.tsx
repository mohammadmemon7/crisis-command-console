import { Zap } from "lucide-react";
import Map from "../Map";

export function MapArea() {
  return (
    <main className="relative flex-1 overflow-hidden bg-[#111111]">
      <div className="h-full w-full">
        <Map />
      </div>

      <button className="absolute right-5 top-5 z-[500] flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-destructive-foreground shadow-lg shadow-destructive/25 transition-all hover:brightness-110 hover:shadow-destructive/40 active:scale-[0.97]">
        <Zap className="h-4 w-4" />
        Inject Chaos
      </button>
    </main>
  );
}
