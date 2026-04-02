import { useEffect, useRef } from "react";
import L from "leaflet";
import { Zap } from "lucide-react";
import "leaflet/dist/leaflet.css";

type DisasterMarker = {
  position: [number, number];
  name: string;
  urgency: number;
  needs: string;
};

const mumbaiCenter: [number, number] = [19.076, 72.8777];

const markers: DisasterMarker[] = [
  {
    position: [19.076, 72.8777],
    name: "Dharavi Relief Camp",
    urgency: 5,
    needs: "Food, Water, Medical",
  },
  {
    position: [19.0178, 72.8478],
    name: "Worli Flood Zone",
    urgency: 4,
    needs: "Rescue Boats, Shelter",
  },
  {
    position: [19.1136, 72.8697],
    name: "Andheri Supply Hub",
    urgency: 2,
    needs: "Volunteers, Clothing",
  },
];

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function buildPopupContent(marker: DisasterMarker) {
  return `
    <div style="min-width: 176px; padding: 2px; font-family: var(--font-display); color: hsl(var(--foreground));">
      <div style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">${marker.name}</div>
      <div style="font-size: 0.75rem; margin-bottom: 0.35rem; color: hsl(var(--primary));">
        Urgency: ${marker.urgency}/5
      </div>
      <div style="font-size: 0.78rem; color: hsl(var(--muted-foreground));">
        Needs: ${marker.needs}
      </div>
    </div>
  `;
}

export function MapArea() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(mumbaiCenter, 12);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    markers.forEach((marker) => {
      L.marker(marker.position)
        .addTo(map)
        .bindPopup(buildPopupContent(marker));
    });

    mapInstanceRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <main className="relative flex-1 overflow-hidden" style={{ background: "hsl(var(--map-bg))" }}>
      <div ref={mapElementRef} className="h-full w-full" aria-label="Disaster response map" />

      <button className="absolute right-5 top-5 z-[500] flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-destructive-foreground shadow-lg shadow-destructive/25 transition-all hover:brightness-110 hover:shadow-destructive/40 active:scale-[0.97]">
        <Zap className="h-4 w-4" />
        Inject Chaos
      </button>
    </main>
  );
}
